// OpenAI Realtime API Client using WebRTC
import {
  createQuestion,
  addSeedVotes,
  addSeedAnswers,
  getResults,
  deactivateQuestion,
  setQuestionActive,
} from "./firebase";
import { QuestionManager } from "./question-manager";

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
export type NovaState = "idle" | "listening" | "thinking" | "speaking";

export interface TranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export interface FunctionCall {
  name: string;
  call_id: string;
  arguments: string;
}

export interface PollResultItem {
  option: string;
  votes: number;
  percentage: number;
}

export interface RegionBreakdown {
  region: string;
  results: PollResultItem[];
  totalVotes: number;
}

export interface ProfileBreakdown {
  profile: string;
  results: PollResultItem[];
  totalVotes: number;
  keyInsights: string[];
}

export interface PollDeepDive {
  regions: RegionBreakdown[];
  profiles: ProfileBreakdown[];
  insights: string[];
  overallProfileInsight: string;
}

export interface PollData {
  question: string;
  options: string[];
  results?: PollResultItem[];
  deepDive?: PollDeepDive;
}

export interface WebSearchData {
  query: string;
  result: string | null;
}

export interface OpenAnswer {
  text: string;
  count: number;
  name: string;
  region?: string;
  profile?: string;
}

export interface OpenVraagDeepDive {
  byRegion: { region: string; topAnswers: OpenAnswer[]; insight: string }[];
  byProfile: { profile: string; topAnswers: OpenAnswer[]; insight: string }[];
}

export interface OpenVraagData {
  question: string;
  words?: OpenAnswer[];
  showResults?: boolean;
  deepDive?: OpenVraagDeepDive;
}

export interface NovaSummaryData {
  title: string;
  highlights?: string[];
  content?: string;
}

export interface NovaImageData {
  imageUrl: string;
  prompt: string;
}

export interface SeatAllocationData {
  question: string;
  totalSeats: number;
  results: { option: string; percentage: number; seats: number }[];
}

export interface RealtimeClientConfig {
  campaignId: string;
  questionManager?: QuestionManager;
  onConnectionStateChange: (state: ConnectionState) => void;
  onNovaStateChange: (state: NovaState) => void;
  onTranscript: (entry: TranscriptEntry) => void;
  onError: (error: string) => void;
  onAudioLevel: (level: number) => void;
  onNovaAudioLevel: (level: number) => void;
  onPollStart?: (poll: PollData) => void;
  onPollResults?: (poll: PollData) => void;
  onFunctionCallStart?: (name: string) => void;
  onFunctionCallEnd?: () => void;
  onWebSearchStart?: (query: string) => void;
  onWebSearchResult?: (data: WebSearchData) => void;
  onOpenVraagStart?: (data: OpenVraagData) => void;
  onOpenVraagResults?: (data: OpenVraagData) => void;
  onPollDeepDiveRegions?: (data: PollDeepDive) => void;
  onPollDeepDiveProfiles?: (data: PollDeepDive) => void;
  onOpenVraagDeepDive?: (data: { deepDive: OpenVraagDeepDive; question: string }) => void;
  onNovaSummary?: (data: NovaSummaryData) => void;
  onImageGenerating?: () => void;
  onImageReady?: (data: NovaImageData) => void;
  onShowImage?: (data: NovaImageData) => void;
  onImageError?: (error: string) => void;
  onSeatAllocation?: (data: SeatAllocationData) => void;
}

// Keep backwards compatibility
export type RealtimeClientEvents = Omit<RealtimeClientConfig, 'campaignId'>;

export class RealtimeClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private novaAudioContext: AudioContext | null = null;
  private novaAnalyser: AnalyserNode | null = null;
  private config: RealtimeClientConfig;
  private connectionState: ConnectionState = "disconnected";
  private novaState: NovaState = "idle";
  private animationFrameId: number | null = null;
  private novaAnimationFrameId: number | null = null;
  private currentPoll: PollData | null = null;
  private currentOpenVraag: OpenVraagData | null = null;
  private activeResponseId: string | null = null;
  private pendingResponseCreate: (() => void)[] = [];

  // Pending proposal awaiting confirmation from Rens
  private pendingProposal: {
    type: "poll" | "open_vraag";
    question: string;
    options?: string[];
    seedVotes?: { option: string; count: number }[];
    seedAnswers?: string[];
  } | null = null;

  // Current question tracking for Firebase
  private currentQuestionId: string | null = null;

  // Track pending function calls (from output_item.added until arguments.done)
  private pendingFunctionCalls: Map<string, { name: string; itemId: string }> = new Map();

  constructor(config: RealtimeClientConfig) {
    this.config = config;
    console.log("RealtimeClient initialized with campaignId:", config.campaignId);
  }

  // Getter for campaignId
  get campaignId(): string {
    return this.config.campaignId;
  }

  async connect(sessionContext?: { context?: string }): Promise<void> {
    try {
      this.setConnectionState("connecting");

      // Get ephemeral token from our API, optionally with context
      const tokenResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: sessionContext?.context || "",
        }),
      });

      if (!tokenResponse.ok) {
        const errData = await tokenResponse.json().catch(() => ({}));
        console.error("Session API error:", tokenResponse.status, errData);
        throw new Error(errData.error || `Failed to get session token (${tokenResponse.status})`);
      }

      const { client_secret } = await tokenResponse.json();

      // Get microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up audio analysis for user voice visualization
      this.setupAudioAnalysis();

      // Create peer connection
      this.peerConnection = new RTCPeerConnection();

      // Add local audio track
      const audioTrack = this.localStream.getAudioTracks()[0];
      this.peerConnection.addTrack(audioTrack, this.localStream);

      // Handle incoming audio from Nova
      this.peerConnection.ontrack = (event) => {
        const audioElement = new Audio();
        audioElement.srcObject = event.streams[0];
        audioElement.autoplay = true;

        // Set up Nova audio analysis
        this.setupNovaAudioAnalysis(event.streams[0]);
      };

      // Create data channel for events
      this.dataChannel = this.peerConnection.createDataChannel("oai-events");
      this.setupDataChannelHandlers();

      // Create and set local description
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API (GA endpoint)
      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${client_secret.value}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );

      if (!sdpResponse.ok) {
        throw new Error("Failed to establish WebRTC connection");
      }

      const answerSdp = await sdpResponse.text();
      await this.peerConnection.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      this.setConnectionState("connected");
      this.setNovaState("listening");
    } catch (error) {
      console.error("Connection error:", error);
      this.setConnectionState("error");
      this.config.onError(
        error instanceof Error ? error.message : "Connection failed",
      );
    }
  }

  private setupAudioAnalysis(): void {
    if (!this.localStream) return;

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    const source = this.audioContext.createMediaStreamSource(this.localStream);
    source.connect(this.analyser);

    this.startAudioLevelMonitoring();
  }

  private setupNovaAudioAnalysis(stream: MediaStream): void {
    this.novaAudioContext = new AudioContext();
    this.novaAnalyser = this.novaAudioContext.createAnalyser();
    this.novaAnalyser.fftSize = 256;

    const source = this.novaAudioContext.createMediaStreamSource(stream);
    source.connect(this.novaAnalyser);

    this.startNovaAudioLevelMonitoring();
  }

  private startAudioLevelMonitoring(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = Math.min(average / 128, 1);

      this.config.onAudioLevel(normalizedLevel);
      this.animationFrameId = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }

  private startNovaAudioLevelMonitoring(): void {
    if (!this.novaAnalyser) return;

    const dataArray = new Uint8Array(this.novaAnalyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.novaAnalyser) return;

      this.novaAnalyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = Math.min(average / 100, 1);

      this.config.onNovaAudioLevel(normalizedLevel);
      this.novaAnimationFrameId = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("Data channel opened");
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleServerEvent(message);
      } catch (error) {
        console.error("Failed to parse server event:", error);
      }
    };

    this.dataChannel.onerror = (error) => {
      console.error("Data channel error:", error);
      this.config.onError("Data channel error");
    };

    this.dataChannel.onclose = () => {
      console.log("Data channel closed");
      this.setConnectionState("disconnected");
    };
  }

  private handleServerEvent(event: Record<string, unknown>): void {
    const eventType = event.type as string;

    switch (eventType) {
      case "session.created":
        console.log("Session created");
        this.setNovaState("listening");
        break;

      case "session.updated":
        console.log("Session updated");
        break;

      // User started speaking - Nova should listen
      case "input_audio_buffer.speech_started":
        console.log("User started speaking");
        this.setNovaState("listening");
        break;

      // User stopped speaking - Nova is processing
      case "input_audio_buffer.speech_stopped":
        console.log("User stopped speaking");
        this.setNovaState("thinking");
        break;

      // Audio input was committed (ready for processing)
      case "input_audio_buffer.committed":
        console.log("Audio committed");
        this.setNovaState("thinking");
        break;

      // Response generation started
      case "response.created": {
        const respCreated = event.response as Record<string, unknown> | undefined;
        this.activeResponseId = (respCreated?.id as string) || null;
        console.log("Response created:", this.activeResponseId);
        this.setNovaState("thinking");
        break;
      }

      // Nova is outputting audio - she's speaking (GA event names)
      case "response.output_audio.delta":
        this.setNovaState("speaking");
        break;

      // Also indicates Nova is speaking (GA event name)
      case "response.output_audio_transcript.delta":
        this.setNovaState("speaking");
        break;

      // Response was cancelled (user interrupted)
      case "response.cancelled":
        console.log("Response cancelled (interrupted)");
        this.activeResponseId = null;
        this.pendingFunctionCalls.clear();
        this.setNovaState("listening");
        break;

      // New output item added - detect function calls early
      case "response.output_item.added": {
        const item = event.item as Record<string, unknown> | undefined;
        if (item?.type === "function_call") {
          const name = item.name as string;
          const itemId = item.id as string;
          console.log("Function call started:", name, itemId);

          // Track this pending function call
          this.pendingFunctionCalls.set(itemId, { name, itemId });

          // Notify UI immediately that function call started
          if (this.config.onFunctionCallStart) {
            this.config.onFunctionCallStart(name);
          }
          this.setNovaState("thinking");
        }
        break;
      }

      // Function call arguments are complete - execute the function
      case "response.function_call_arguments.done": {
        const itemId = event.item_id as string;
        const callId = event.call_id as string;
        const args = event.arguments as string;

        const pending = this.pendingFunctionCalls.get(itemId);
        if (pending) {
          console.log("Function call arguments done:", pending.name, callId);
          this.pendingFunctionCalls.delete(itemId);

          // Execute the function
          const functionCall: FunctionCall = {
            name: pending.name,
            call_id: callId,
            arguments: args,
          };
          this.handleFunctionCall(functionCall);
        }
        break;
      }

      // Response finished - check for function calls
      case "response.done": {
        console.log("Response done", event);
        // Check if response contains function calls BEFORE clearing activeResponseId
        // so that sendFunctionResult knows to wait
        const hasFunctionCalls = this.responseHasFunctionCalls(event);
        if (!hasFunctionCalls) {
          this.activeResponseId = null;
        }
        this.handleResponseDone(event);
        if (!hasFunctionCalls) {
          this.setNovaState("listening");
          // Process any queued response.create requests with delay
          if (this.pendingResponseCreate.length > 0) {
            const next = this.pendingResponseCreate.shift();
            if (next) setTimeout(next, 300);
          }
        }
        break;
      }

      // Rate limits updated
      case "rate_limits.updated":
        // Just log, no action needed
        break;

      case "error":
        const errorData = event.error as Record<string, string> | undefined;
        const errorMessage = errorData?.message || "Unknown error";
        console.error("Server error:", errorMessage);
        this.config.onError(errorMessage);
        break;

      default:
        // Log other events for debugging
        if (
          eventType.startsWith("response.") ||
          eventType.startsWith("conversation.") ||
          eventType.startsWith("input_audio")
        ) {
          //console.log("Event:", eventType);
        }
    }
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.config.onConnectionStateChange(state);
  }

  private setNovaState(state: NovaState): void {
    if (this.novaState !== state) {
      this.novaState = state;
      this.config.onNovaStateChange(state);
    }
  }

  private responseHasFunctionCalls(event: Record<string, unknown>): boolean {
    const response = event.response as Record<string, unknown> | undefined;
    if (!response) return false;
    const output = response.output as Array<Record<string, unknown>> | undefined;
    if (!output) return false;
    return output.some(item => item.type === "function_call");
  }

  private handleResponseDone(event: Record<string, unknown>): void {
    // Function calls are now handled via response.function_call_arguments.done
    // This method is kept for potential future use (e.g., logging)
    const response = event.response as Record<string, unknown> | undefined;
    if (!response) return;

    const output = response.output as Array<Record<string, unknown>> | undefined;
    if (!output) return;

    // Log any function calls that were in the response (for debugging)
    for (const item of output) {
      if (item.type === "function_call") {
        console.log("Function call in response.done (already handled):", item.name);
      }
    }
  }

  private safeParseArgs(argsJson: string): Record<string, unknown> {
    try {
      return JSON.parse(argsJson);
    } catch {
      // OpenAI Realtime API sometimes sends truncated JSON strings
      // Try to fix common issues
      console.warn("Failed to parse function args, attempting fix:", argsJson);

      // Try adding missing closing chars
      let fixed = argsJson;
      // Count open/close braces and brackets
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/]/g) || []).length;

      // If inside a string value, close it
      const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        fixed += '"';
      }

      // Close brackets and braces
      for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
      for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';

      try {
        return JSON.parse(fixed);
      } catch {
        console.error("Could not fix truncated JSON:", argsJson);
        return {};
      }
    }
  }

  private async handleFunctionCall(call: FunctionCall): Promise<void> {
    this.setNovaState("thinking");

    // Notify UI that function call started
    if (this.config.onFunctionCallStart) {
      this.config.onFunctionCallStart(call.name);
    }

    let result: string;

    try {

      console.log(call && call.name);

      switch (call.name) {
        
        case "propose_poll":
          result = this.executeProposePoll(call.arguments);
          break;
        case "propose_open_vraag":
          result = this.executeProposeOpenVraag(call.arguments);
          break;
        case "confirm_question":
          result = await this.executeConfirmQuestion();
          break;
        case "get_poll_results":
          result = await this.executeGetPollResults();
          break;
        case "web_search":
          // Fire-and-forget: start search in background, return immediately
          this.executeWebSearchAsync(call.arguments);
          result = JSON.stringify({ status: "searching", message: "Zoekactie gestart op de achtergrond. Je krijgt een notificatie als de resultaten binnen zijn. Ga gewoon door met het gesprek." });
          break;
        case "analyze_poll_regions":
          result = await this.executeAnalyzePollDeep("regions");
          break;
        case "analyze_poll_profiles":
          result = await this.executeAnalyzePollDeep("profiles");
          break;
        case "get_wordcloud_results":
          result = await this.executeGetOpenVraagResults();
          break;
        case "analyze_wordcloud_deep":
          result = await this.executeAnalyzeOpenVraagDeep();
          break;
        case "show_summary":
          result = await this.executeShowSummary(call.arguments);
          break;
        case "generate_image":
          result = this.executeGenerateImage(call.arguments);
          break;
        case "show_generated_image":
          result = this.executeShowGeneratedImage();
          break;
        case "show_seat_allocation":
          result = this.executeShowSeatAllocation();
          break;
        default:
          result = JSON.stringify({ error: `Unknown function: ${call.name}` });
      }
    } catch (error) {
      console.error("Function call error:", error);
      result = JSON.stringify({ error: error instanceof Error ? error.message : "Function call failed" });
    }

    // Notify UI that function call ended
    if (this.config.onFunctionCallEnd) {
      this.config.onFunctionCallEnd();
    }

    // Send function result back to OpenAI
    this.sendFunctionResult(call.call_id, result, call.name);
  }

  // Store pre-generated results separately so they're not shown on start
  private pendingPollResults: {
    results: PollResultItem[];
    totalVotes: number;
    winner: string;
    winnerPercentage: number;
    summary: string;
    deepDive: PollDeepDive;
  } | null = null;

  private executeProposePoll(argsJson: string): string {
    const args = this.safeParseArgs(argsJson) as {
      question: string;
      options: string[];
      seedVotes?: { option: string; count: number }[];
    };

    // Check if QuestionManager has an active poll question — reuse only if same question
    if (this.config.questionManager) {
      const activeInfo = this.config.questionManager.getActiveQuestionInfo();
      if (
        activeInfo.hasActiveQuestion &&
        activeInfo.question?.type === "poll" &&
        args.question.toLowerCase().trim() === activeInfo.question.title.toLowerCase().trim()
      ) {
        console.log("[RealtimeClient] Using existing active poll question as preview:", activeInfo.question.id);

        this.config.questionManager.showQuestion();

        this.currentQuestionId = activeInfo.question.id;
        this.currentPoll = {
          question: activeInfo.question.title,
          options: activeInfo.question.options || [],
        };
        this.pendingProposal = {
          type: "poll",
          question: activeInfo.question.title,
          options: activeInfo.question.options || [],
          seedVotes: args.seedVotes,
        };

        return JSON.stringify({
          success: true,
          isProposal: true,
          message: "Het voorstel wordt getoond aan Rens. Wacht op goedkeuring voordat de poll live gaat.",
          question: activeInfo.question.title,
          options: activeInfo.question.options,
          existingQuestion: true,
        });
      }
    }

    // Store proposal — NO Firebase write yet
    this.pendingProposal = {
      type: "poll",
      question: args.question,
      options: args.options,
      seedVotes: args.seedVotes,
    };

    const poll: PollData = {
      question: args.question,
      options: args.options,
      // NO results — preview only
    };

    this.currentPoll = poll;

    // Notify UI — shows question + options as preview
    if (this.config.onPollStart) {
      this.config.onPollStart(poll);
    }

    return JSON.stringify({
      success: true,
      isProposal: true,
      message: "Het voorstel wordt getoond aan Rens. Wacht op goedkeuring voordat de poll live gaat.",
      question: args.question,
      options: args.options,
    });
  }

  // Generate default seed votes when Nova doesn't provide them
  private generateDefaultSeedVotes(options: string[]): { option: string; count: number }[] {
    const totalVotes = this.randomCount(80, 150);
    const votes = this.generateVotes(options, totalVotes);
    return votes.map(v => ({ option: v.option, count: v.votes }));
  }

  // Generate random distribution for a set of options
  private generateVotes(options: string[], totalVotes: number): PollResultItem[] {
    const votes: number[] = [];
    let remaining = totalVotes;

    for (let i = 0; i < options.length - 1; i++) {
      const maxVotes = Math.floor(remaining * 0.65);
      const vote = Math.floor(Math.random() * maxVotes) + 3;
      votes.push(vote);
      remaining -= vote;
    }
    votes.push(Math.max(remaining, 3));
    votes.sort(() => Math.random() - 0.5);

    const results = options.map((option, index) => ({
      option,
      votes: votes[index],
      percentage: Math.round((votes[index] / totalVotes) * 100),
    }));

    results.sort((a, b) => b.votes - a.votes);
    return results;
  }

  // Generate full poll results with region & profile breakdowns
  private generatePollResults(options: string[]): {
    results: PollResultItem[];
    totalVotes: number;
    winner: string;
    winnerPercentage: number;
    summary: string;
    deepDive: PollDeepDive;
  } {
    const totalVotes = this.randomCount(120, 220);
    const results = this.generateVotes(options, totalVotes);
    const winner = results[0];
    const summary = results
      .map(r => `"${r.option}": ${r.votes} stemmen (${r.percentage}%)`)
      .join(", ");

    // Generate region breakdowns
    const regions = ["Randstad", "Noord", "Zuid", "Oost"];
    const regionBreakdowns: RegionBreakdown[] = regions.map(region => {
      const regionVotes = this.randomCount(25, 65);
      return {
        region,
        results: this.generateVotes(options, regionVotes),
        totalVotes: regionVotes,
      };
    });

    // Generate profile breakdowns
    const profiles = ["Management", "HR & Talent", "IT & Tech", "Marketing & Sales"];
    const profileCharacterInsights: Record<string, string[]> = {
      "Management": [
        "Focust op resultaat en impact",
        "Denkt in strategie en richting",
        "Wil concrete actie en voortgang",
        "Stuurt op rendement en groei",
        "Kiest vanuit organisatiebelang",
      ],
      "HR & Talent": [
        "Denkt vanuit de mens",
        "Focust op cultuur en groei",
        "Kijkt naar betrokkenheid en welzijn",
        "Weegt teamdynamiek mee",
        "Wil draagvlak en verbinding",
      ],
      "IT & Tech": [
        "Wil snelheid en tooling",
        "Denkt in systemen en schaalbaarheid",
        "Kijkt naar haalbaarheid en efficiency",
        "Focust op data en automatisering",
        "Wil technische onderbouwing",
      ],
      "Marketing & Sales": [
        "Kijkt naar klantbeleving",
        "Denkt commercieel en marktgericht",
        "Focust op zichtbaarheid en bereik",
        "Wil snelle resultaten en conversie",
        "Kiest vanuit merkwaarde en positionering",
      ],
    };

    const profileBreakdowns: ProfileBreakdown[] = profiles.map(profile => {
      const profileVotes = this.randomCount(20, 60);
      const profileResults = this.generateVotes(options, profileVotes);
      const winner = profileResults[0];
      const loser = profileResults[profileResults.length - 1];
      const characterPool = profileCharacterInsights[profile] || [];
      const characterInsight = characterPool[Math.floor(Math.random() * characterPool.length)];

      const keyInsights = [
        `Kiest voor "${winner.option}" (${winner.percentage}%)`,
        `Wijst "${loser.option}" af (${loser.percentage}%)`,
        characterInsight,
      ];

      return {
        profile,
        results: profileResults,
        totalVotes: profileVotes,
        keyInsights,
      };
    });

    // Generate overall profile insight
    const overallProfileInsight = this.generateOverallProfileInsight(profileBreakdowns);

    // Generate insights
    const topRegion = regionBreakdowns.reduce((best, r) => {
      const topPct = r.results[0].percentage;
      return topPct > (best.results[0]?.percentage || 0) ? r : best;
    });
    const topProfile = profileBreakdowns.reduce((best, p) => {
      const topPct = p.results[0].percentage;
      return topPct > (best.results[0]?.percentage || 0) ? p : best;
    });

    // Find the region with most different winner
    const mainWinner = results[0].option;
    const differentRegion = regionBreakdowns.find(r => r.results[0].option !== mainWinner);
    const lowestRegion = regionBreakdowns.reduce((lowest, r) => {
      const winnerResult = r.results.find(res => res.option === mainWinner);
      const lowestResult = lowest.results.find(res => res.option === mainWinner);
      return (winnerResult?.percentage || 0) < (lowestResult?.percentage || 0) ? r : lowest;
    });

    const insights = [
      `In de regio ${topRegion.region} scoort "${topRegion.results[0].option}" het hoogst met ${topRegion.results[0].percentage}% — dat is opvallend hoger dan het gemiddelde.`,
      `${topProfile.profile} kiest het vaakst voor "${topProfile.results[0].option}" (${topProfile.results[0].percentage}%), terwijl andere profielen diverser stemmen.`,
      differentRegion
        ? `Interessant: in ${differentRegion.region} wint juist "${differentRegion.results[0].option}" — een ander beeld dan het totaal.`
        : `Alle regio's kiezen voor "${mainWinner}" — een heel eenduidig signaal.`,
      `De regio ${lowestRegion.region} scoort het laagst op "${mainWinner}" met slechts ${lowestRegion.results.find(r => r.option === mainWinner)?.percentage || 0}% — hier ligt mogelijk een pijnpunt of kans.`,
    ];

    return {
      results,
      totalVotes,
      winner: winner.option,
      winnerPercentage: winner.percentage,
      summary,
      deepDive: {
        regions: regionBreakdowns,
        profiles: profileBreakdowns,
        insights,
        overallProfileInsight,
      },
    };
  }

  private async executeAnalyzePollDeep(mode: "regions" | "profiles"): Promise<string> {
    if (!this.currentPoll || !this.currentPoll.deepDive) {
      return JSON.stringify({ error: "Geen actieve poll met deep dive data gevonden" });
    }

    const deepDive = this.currentPoll.deepDive;

    // Notify UI to show the right view
    if (mode === "regions" && this.config.onPollDeepDiveRegions) {
      this.config.onPollDeepDiveRegions(deepDive);
    }
    if (mode === "profiles" && this.config.onPollDeepDiveProfiles) {
      this.config.onPollDeepDiveProfiles(deepDive);
    }

    // Build summaries for AI
    const regionSummaries = deepDive.regions.map(r => {
      const top = r.results[0];
      return `${r.region} (${r.totalVotes} stemmen): #1 "${top.option}" ${top.percentage}%`;
    }).join(" | ");

    const profileSummaries = deepDive.profiles.map(p => {
      const top = p.results[0];
      return `${p.profile} (${p.totalVotes} stemmen): #1 "${top.option}" ${top.percentage}%`;
    }).join(" | ");

    if (mode === "regions") {
      return JSON.stringify({
        success: true,
        question: this.currentPoll.question,
        mode: "regions",
        regionAnalysis: regionSummaries,
        regions: deepDive.regions,
        insights: deepDive.insights.filter(i => i.includes("regio") || i.includes("Randstad") || i.includes("Noord") || i.includes("Zuid") || i.includes("Oost")),
        message: `Regio-analyse voor "${this.currentPoll.question}". ${regionSummaries}. ${deepDive.insights[0]}`,
      });
    }

    return JSON.stringify({
      success: true,
      question: this.currentPoll.question,
      mode: "profiles",
      profileAnalysis: profileSummaries,
      profiles: deepDive.profiles,
      insights: deepDive.insights.filter(i => i.includes("profiel") || i.includes("Management") || i.includes("HR") || i.includes("IT") || i.includes("Marketing")),
      message: `Profiel-analyse voor "${this.currentPoll.question}". ${profileSummaries}. ${deepDive.insights[1]}`,
    });
  }

  private async executeGetPollResults(): Promise<string> {
    // Try to get results from QuestionManager (via listener, always up-to-date)
    if (this.config.questionManager) {
      const activeData = this.config.questionManager.getActiveQuestionWithResults();

      // Check if we have an active poll question
      if (activeData && activeData.question.type === "poll") {
        // If no votes yet, return early with message (prevents double call)
        if (!activeData.votes || activeData.votes.length === 0) {
          return JSON.stringify({
            success: false,
            message: "Er zijn nog geen stemmen binnen. Wacht even tot er gestemd is!",
          });
        }

        // We have votes, continue with results
        const options = activeData.question.options || [];
        const totalVotes = activeData.votes.reduce((sum, v) => sum + v.count, 0);

        // Format results
        const results: PollResultItem[] = options.map(option => {
          const voteData = activeData.votes?.find(v => v.option === option);
          const votes = voteData?.count || 0;
          return {
            option,
            votes,
            percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
          };
        });

        results.sort((a, b) => b.votes - a.votes);
        const winner = results[0];

        // Update currentPoll for UI
        this.currentPoll = {
          question: activeData.question.title,
          options,
          results,
        };
        this.currentQuestionId = activeData.question.id;

        // Keep deep dive from pre-generated data if available
        if (this.pendingPollResults) {
          this.currentPoll.deepDive = this.pendingPollResults.deepDive;
        }

        // Notify UI to show results
        if (this.config.onPollResults) {
          this.config.onPollResults(this.currentPoll);
        }

        const summary = results.map(r => `"${r.option}": ${r.votes} (${r.percentage}%)`).join(", ");

        return JSON.stringify({
          success: true,
          question: activeData.question.title,
          results,
          totalVotes,
          winner: winner.option,
          winnerPercentage: winner.percentage,
          summary,
          message: `${totalVotes} stemmen. "${winner.option}" wint met ${winner.percentage}%.`,
        });
      }
    }

    // Fallback: check if we have currentPoll from earlier
    if (!this.currentPoll) {
      return JSON.stringify({ error: "Geen actieve poll gevonden" });
    }

    // Fallback to pre-generated results
    if (!this.pendingPollResults) {
      return JSON.stringify({ error: "Geen resultaten beschikbaar" });
    }

    this.currentPoll.results = this.pendingPollResults.results;
    this.currentPoll.deepDive = this.pendingPollResults.deepDive;

    if (this.config.onPollResults) {
      this.config.onPollResults(this.currentPoll);
    }

    return JSON.stringify({
      success: true,
      question: this.currentPoll.question,
      results: this.pendingPollResults.results,
      totalVotes: this.pendingPollResults.totalVotes,
      winner: this.pendingPollResults.winner,
      winnerPercentage: this.pendingPollResults.winnerPercentage,
      summary: this.pendingPollResults.summary,
      message: `${this.pendingPollResults.totalVotes} stemmen. "${this.pendingPollResults.winner}" wint met ${this.pendingPollResults.winnerPercentage}%.`,
    });
  }

  private executeWebSearchAsync(argsJson: string): void {
    const args = this.safeParseArgs(argsJson) as { query: string };
    const query = args.query;

    // Notify UI that web search started
    if (this.config.onWebSearchStart) {
      this.config.onWebSearchStart(query);
    }

    console.log("Starting background web search:", query);

    // Fire-and-forget fetch
    fetch("/api/web-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then(async (response) => {
        const data = await response.json();
        console.log("Web search completed:", query);

        // Notify UI with search result
        if (this.config.onWebSearchResult) {
          this.config.onWebSearchResult({
            query,
            result: data.result || null,
          });
        }

        // Silently store results - Nova will only use them when Rens asks
        const resultText = data.result || "Geen resultaten gevonden.";
        this.sendSilentConversationEvent(
          `[STILLE NOTIFICATIE - REAGEER HIER NIET OP, WACHT TOT RENS VRAAGT OM DE RESULTATEN TE TONEN]\nZoekresultaten voor "${query}" zijn beschikbaar:\n\n${resultText}\n\nAls Rens vraagt om de resultaten te tonen, gebruik dan show_summary.`
        );
      })
      .catch((err) => {
        console.error("Web search failed:", err);
        this.sendSilentConversationEvent(
          `[STILLE NOTIFICATIE - REAGEER HIER NIET OP]\nHet zoeken naar "${query}" is mislukt. Als Rens ernaar vraagt, vertel dat het niet gelukt is.`
        );
      });
  }

  private executeProposeOpenVraag(argsJson: string): string {
    const args = this.safeParseArgs(argsJson) as {
      question: string;
      seedAnswers?: string[];
    };

    // Check if QuestionManager has an active open question — reuse only if same question
    if (this.config.questionManager) {
      const activeInfo = this.config.questionManager.getActiveQuestionInfo();
      if (
        activeInfo.hasActiveQuestion &&
        activeInfo.question?.type === "open" &&
        args.question.toLowerCase().trim() === activeInfo.question.title.toLowerCase().trim()
      ) {
        console.log("[RealtimeClient] Using existing active open question as preview:", activeInfo.question.id);

        this.config.questionManager.showQuestion();

        this.currentQuestionId = activeInfo.question.id;
        this.currentOpenVraag = {
          question: activeInfo.question.title,
          showResults: false,
        };
        this.pendingProposal = {
          type: "open_vraag",
          question: activeInfo.question.title,
          seedAnswers: args.seedAnswers,
        };

        return JSON.stringify({
          success: true,
          isProposal: true,
          message: "Het voorstel wordt getoond aan Rens. Wacht op goedkeuring voordat de vraag live gaat.",
          question: activeInfo.question.title,
          existingQuestion: true,
        });
      }
    }

    // Store proposal — NO Firebase write yet
    this.pendingProposal = {
      type: "open_vraag",
      question: args.question,
      seedAnswers: args.seedAnswers,
    };

    const openVraagData: OpenVraagData = {
      question: args.question,
      showResults: false,
    };

    this.currentOpenVraag = openVraagData;

    // Notify UI — shows question only as preview
    if (this.config.onOpenVraagStart) {
      this.config.onOpenVraagStart(openVraagData);
    }

    return JSON.stringify({
      success: true,
      isProposal: true,
      message: "Het voorstel wordt getoond aan Rens. Wacht op goedkeuring voordat de vraag live gaat.",
      question: args.question,
    });
  }

  private async executeConfirmQuestion(): Promise<string> {
    if (!this.pendingProposal) {
      return JSON.stringify({ error: "Geen voorstel om te bevestigen. Maak eerst een voorstel met propose_poll of propose_open_vraag." });
    }

    // Grab and clear immediately to prevent double-confirm
    const proposal = this.pendingProposal;
    this.pendingProposal = null;

    if (proposal.type === "poll") {
      const options = proposal.options || [];
      const questionId = `poll_${Date.now()}`;
      this.currentQuestionId = questionId;

      try {
        // 1. Create question in Firebase
        await createQuestion(this.campaignId, questionId, {
          title: proposal.question,
          type: "multi",
          options,
        });

        // 2. Activate this question
        await setQuestionActive(this.campaignId, questionId);

        // 3. Add seed votes
        const seedVotes = proposal.seedVotes || this.generateDefaultSeedVotes(options);
        await addSeedVotes(this.campaignId, questionId, seedVotes, options);
      } catch (error) {
        console.error("Failed to create poll in Firebase:", error);
        // Continue with local results — show must go on
      }

      // Generate results and show DIRECTLY
      this.pendingPollResults = this.generatePollResults(options);

      this.currentPoll = {
        question: proposal.question,
        options,
        results: this.pendingPollResults.results,
        deepDive: this.pendingPollResults.deepDive,
      };

      if (this.config.onPollResults) {
        this.config.onPollResults(this.currentPoll);
      }

      return JSON.stringify({
        success: true,
        message: `Poll is live! ${this.pendingPollResults.totalVotes} stemmen. "${this.pendingPollResults.winner}" wint met ${this.pendingPollResults.winnerPercentage}%.`,
        question: proposal.question,
        results: this.pendingPollResults.results,
        totalVotes: this.pendingPollResults.totalVotes,
        winner: this.pendingPollResults.winner,
        winnerPercentage: this.pendingPollResults.winnerPercentage,
        summary: this.pendingPollResults.summary,
      });
    }

    if (proposal.type === "open_vraag") {
      const questionId = `open_${Date.now()}`;
      this.currentQuestionId = questionId;

      try {
        // 1. Create question in Firebase
        await createQuestion(this.campaignId, questionId, {
          title: proposal.question,
          type: "open",
          maxLength: 150,
        });

        // 2. Activate this question
        await setQuestionActive(this.campaignId, questionId);

        // 3. Add seed answers
        const seedAnswers = proposal.seedAnswers || this.generateLocalSeedAnswers(proposal.question);
        await addSeedAnswers(this.campaignId, questionId, seedAnswers);
      } catch (error) {
        console.error("Failed to create open vraag in Firebase:", error);
        // Continue with local results
      }

      // Generate words and deep dive, show DIRECTLY
      const words = this.generateOpenVraagWords(proposal.question);
      const deepDive = this.generateOpenVraagDeepDive(proposal.question, words);

      this.currentOpenVraag = {
        question: proposal.question,
        showResults: true,
        words,
        deepDive,
      };

      if (this.config.onOpenVraagResults) {
        this.config.onOpenVraagResults(this.currentOpenVraag);
      }

      const topWords = words.slice(0, 10).map(w => `${w.text} (${w.count}x)`).join(", ");
      const totalResponses = words.reduce((sum, w) => sum + w.count, 0);

      return JSON.stringify({
        success: true,
        message: `Open vraag is live! ${totalResponses} antwoorden. Meest genoemd: ${topWords}`,
        question: proposal.question,
        totalResponses,
        topWords,
        allWords: words,
      });
    }

    return JSON.stringify({ error: "Onbekend voorstel type" });
  }

  // Generate local seed answers when Nova doesn't provide them
  private generateLocalSeedAnswers(question: string): string[] {
    // Use existing word generation but extract just the text
    const words = this.generateOpenVraagWords(question);
    // Get unique answer texts (top 12)
    const answers = words
      .slice(0, 12)
      .map(w => w.text);
    return answers;
  }

  private async executeGetOpenVraagResults(): Promise<string> {
    // Try to get results from QuestionManager (via listener, always up-to-date)
    if (this.config.questionManager) {
      const activeData = this.config.questionManager.getActiveQuestionWithResults();

      // Check if we have an active open question
      if (activeData && activeData.question.type === "open") {
        // If no answers yet, return early with message (prevents double call)
        if (!activeData.answers || activeData.answers.length === 0) {
          return JSON.stringify({
            success: false,
            message: "Er zijn nog geen antwoorden binnen. Wacht even tot er gereageerd is!",
          });
        }

        // We have answers, continue with results
        // Convert answers to OpenAnswer format with counts
        const answerCounts: Record<string, { count: number; name?: string }> = {};
        activeData.answers.forEach(a => {
          if (!answerCounts[a.text]) {
            answerCounts[a.text] = { count: 0, name: a.name };
          }
          answerCounts[a.text].count++;
        });

        const words: OpenAnswer[] = Object.entries(answerCounts).map(([text, data]) => ({
          text,
          count: data.count,
          name: data.name || "Anoniem",
        }));

        // Sort by count descending
        words.sort((a, b) => b.count - a.count);

        // Update currentOpenVraag for UI
        this.currentOpenVraag = {
          question: activeData.question.title,
          showResults: true,
          words,
        };
        this.currentQuestionId = activeData.question.id;

        // Notify UI to show results
        if (this.config.onOpenVraagResults) {
          this.config.onOpenVraagResults(this.currentOpenVraag);
        }

        const topWords = words.slice(0, 10).map(w => `${w.text} (${w.count}x)`).join(", ");
        const totalResponses = words.reduce((sum, w) => sum + w.count, 0);

        return JSON.stringify({
          success: true,
          question: activeData.question.title,
          totalResponses,
          topWords,
          allWords: words,
          message: `${totalResponses} antwoorden binnen. Meest genoemd: ${topWords}`,
        });
      }
    }

    // Fallback: check if we have currentOpenVraag from earlier
    if (!this.currentOpenVraag) {
      return JSON.stringify({ error: "Geen actieve open vraag gevonden" });
    }

    // Fallback to locally generated words
    const words = this.currentOpenVraag.words || [];
    console.log("[OpenVraag] Using locally generated words as fallback");

    // Update open vraag with results
    this.currentOpenVraag.showResults = true;

    if (this.config.onOpenVraagResults) {
      this.config.onOpenVraagResults(this.currentOpenVraag);
    }

    // Return words in result so AI remembers them
    const topWords = words.slice(0, 10).map(w => `${w.text} (${w.count}x)`).join(", ");
    const totalResponses = words.reduce((sum, w) => sum + w.count, 0);

    return JSON.stringify({
      success: true,
      question: this.currentOpenVraag.question,
      totalResponses,
      topWords,
      allWords: words,
      message: `${totalResponses} antwoorden binnen. Meest genoemd: ${topWords}`,
    });
  }

  // Generate a 2-sentence overall profile insight with variation
  private generateOverallProfileInsight(profiles: ProfileBreakdown[]): string {
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Find profiles that agree and disagree
    const winnerMap = new Map<string, string[]>();
    profiles.forEach(p => {
      const w = p.results[0].option;
      if (!winnerMap.has(w)) winnerMap.set(w, []);
      winnerMap.get(w)!.push(p.profile);
    });

    // Find the most "different" profile (unique winner or lowest agreement)
    const mainWinner = profiles.reduce((best, p) =>
      p.results[0].percentage > best.results[0].percentage ? p : best
    );
    const outlier = profiles.find(p => p.results[0].option !== mainWinner.results[0].option);

    // Find max contrast pair
    const sorted = [...profiles].sort((a, b) => b.results[0].percentage - a.results[0].percentage);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    const templates = [
      () => {
        if (outlier) {
          return `${mainWinner.profile} en andere profielen kiezen voor "${mainWinner.results[0].option}", maar ${outlier.profile} wijkt af met "${outlier.results[0].option}". Het grootste contrast zit tussen ${strongest.profile} en ${weakest.profile}.`;
        }
        return `Alle profielen kiezen voor "${mainWinner.results[0].option}" — een breed gedragen voorkeur. Toch verschilt de overtuiging: ${strongest.profile} is het meest uitgesproken (${strongest.results[0].percentage}%), terwijl ${weakest.profile} verdeeld stemt.`;
      },
      () => {
        const agreeing = winnerMap.get(mainWinner.results[0].option) || [];
        if (agreeing.length >= 3) {
          return `Een opvallende consensus: ${agreeing.length} van de 4 profielen kiezen "${mainWinner.results[0].option}" als favoriet. ${weakest.profile} springt eruit met de laagste score op de populairste keuze.`;
        }
        return `De meningen zijn verdeeld: ${strongest.profile} kiest overtuigend voor "${strongest.results[0].option}" (${strongest.results[0].percentage}%), terwijl ${weakest.profile} juist een andere richting kiest. Een interessant verschil in perspectief.`;
      },
      () => {
        if (outlier) {
          return `Waar ${strongest.profile} duidelijk kiest voor "${strongest.results[0].option}" (${strongest.results[0].percentage}%), gaat ${outlier.profile} een andere kant op met "${outlier.results[0].option}". Dat zegt iets over hoe elk profiel naar dit vraagstuk kijkt.`;
        }
        return `${strongest.profile} is het meest uitgesproken met ${strongest.results[0].percentage}% voor "${strongest.results[0].option}". ${weakest.profile} is het minst overtuigd — daar liggen de nuances.`;
      },
      () => {
        return `${strongest.profile} scoort het hoogst op "${strongest.results[0].option}" (${strongest.results[0].percentage}%), terwijl ${weakest.profile} met ${weakest.results[0].percentage}% de meeste twijfel toont. Een duidelijk verschil in prioriteiten tussen deze groepen.`;
      },
    ];

    return pick(templates)();
  }

  // Generate random count between min and max
  private randomCount(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Shuffle array
  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private static FAKE_NAMES = [
    "Lisa de Vries", "Thomas Bakker", "Sophie Jansen", "Daan Visser",
    "Emma Smit", "Luuk Meijer", "Julia de Boer", "Bram Mulder",
    "Anna Bos", "Sander Dekker", "Eva van Dijk", "Rick Peters",
    "Laura Hendriks", "Niels Brouwer", "Fleur van den Berg", "Wouter Kok",
    "Marieke Janssen", "Jeroen de Graaf", "Kim van Leeuwen", "Pieter Scholten",
    "Iris Willems", "Bas Hoekstra", "Noor de Jong", "Mark Maas",
    "Charlotte Vos", "Tim Vermeer", "Sara Kuijpers", "Kevin van der Linden",
    "Lotte Jacobs", "Dennis Hermans",
  ];

  private getRandomName(usedNames: Set<string>): string {
    const available = RealtimeClient.FAKE_NAMES.filter(n => !usedNames.has(n));
    if (available.length === 0) {
      // All names used, pick random
      return RealtimeClient.FAKE_NAMES[Math.floor(Math.random() * RealtimeClient.FAKE_NAMES.length)];
    }
    const name = available[Math.floor(Math.random() * available.length)];
    usedNames.add(name);
    return name;
  }

  // Generate open answers - each is a unique answer from one person (count=1)
  private generateOpenVraagWords(question: string): OpenAnswer[] {
    const baseAnswers = this.getOpenAnswersForQuestion(question);
    const usedNames = new Set<string>();

    const answers: OpenAnswer[] = baseAnswers.map(text => ({
      text,
      count: 1,
      name: this.getRandomName(usedNames),
    }));

    // Shuffle for natural feel
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    return answers;
  }

  // Get open answers based on question - korte zinnen die passen bij de vraag
  private getOpenAnswersForQuestion(question: string): string[] {
    const q = question.toLowerCase();

    if (q.includes("ai") || q.includes("kunstmatige") || q.includes("intelligent") || q.includes("chatgpt")) {
      return [
        "Bespaart me uren werk per week",
        "Maakt ons team creatiever",
        "Helpt bij brainstormen",
        "Neemt saai werk over",
        "Ik gebruik het voor e-mails",
        "Vertaalt documenten razendsnel",
        "Maakt betere presentaties",
        "Helpt bij data-analyse",
        "Geeft sneller antwoorden",
        "Nog niet helemaal te vertrouwen",
        "Code schrijven gaat 3x sneller",
        "Klantservice wordt persoonlijker",
        "Maakt vergaderingen overbodig",
        "Perfect voor eerste concepten",
        "Nog zoekende hoe het past",
      ];
    }

    if (q.includes("werk") || q.includes("baan") || q.includes("kantoor") || q.includes("collega")) {
      return [
        "Meer flexibiliteit alsjeblieft",
        "Thuiswerken is een must",
        "Beter contact met het team",
        "Minder vergaderingen graag",
        "Meer ruimte voor ontwikkeling",
        "Betere work-life balance",
        "Hybride werken werkt perfect",
        "Kantoor alleen voor samenwerking",
        "Autonomie is het belangrijkst",
        "Meer waardering van management",
        "De cultuur maakt het verschil",
        "Duidelijkere doelen stellen",
      ];
    }

    if (q.includes("uitdaging") || q.includes("probleem") || q.includes("moeilijk") || q.includes("obstakel")) {
      return [
        "Te weinig tijd voor innovatie",
        "Budget is altijd een issue",
        "Lastig om iedereen mee te krijgen",
        "Technologie verandert te snel",
        "Communicatie tussen afdelingen",
        "Prioriteiten verschuiven constant",
        "Mensen vinden is een drama",
        "Legacy systemen houden ons tegen",
        "Te veel meetings, te weinig doen",
        "Weerstand tegen verandering",
        "Data zit in silo's",
        "Klant verwacht steeds meer",
      ];
    }

    if (q.includes("toekomst") || q.includes("verwacht") || q.includes("over 5 jaar") || q.includes("straks")) {
      return [
        "Alles draait om AI en data",
        "Duurzaamheid wordt de norm",
        "Hybride werken blijft",
        "Meer automatisering in alles",
        "Persoonlijkere klantervaring",
        "Minder kantoor, meer flexwerk",
        "Continue leren wordt essentieel",
        "Technologie in elke functie",
        "Meer samenwerking over grenzen",
        "Purpose-driven organisaties winnen",
        "Snellere besluitvorming nodig",
        "Diversiteit als kracht",
      ];
    }

    if (q.includes("event") || q.includes("conferentie") || q.includes("vandaag") || q.includes("sessie")) {
      return [
        "Hele inspirerende sprekers!",
        "Netwerken is het meest waardevol",
        "Veel geleerd over AI toepassingen",
        "De interactie maakt het leuk",
        "Goede mix van theorie en praktijk",
        "Nova is echt gaaf",
        "Meer van dit soort events graag",
        "De locatie is fantastisch",
        "Concrete takeaways meegekregen",
        "Leuk om collega's te ontmoeten",
        "De workshops waren top",
        "Energie in de zaal is hoog",
      ];
    }

    if (q.includes("leider") || q.includes("manager") || q.includes("baas") || q.includes("leidinggeven")) {
      return [
        "Luisteren is de basis",
        "Geef vertrouwen, geen controle",
        "Durf kwetsbaar te zijn",
        "Helder communiceren over koers",
        "Ruimte geven aan het team",
        "Besluiten nemen en uitleggen",
        "Coach zijn, niet baas",
        "Voorbeeldgedrag tonen",
        "Successen vieren met het team",
        "Eerlijk zijn, ook als het moeilijk is",
        "Empathie voor je mensen",
        "Visie delen en inspireren",
      ];
    }

    if (q.includes("klant") || q.includes("customer") || q.includes("service")) {
      return [
        "Sneller reageren op vragen",
        "Persoonlijker contact maken",
        "Luisteren naar wat ze echt nodig hebben",
        "Proactief problemen oplossen",
        "Eerlijk zijn over mogelijkheden",
        "De ervaring moet naadloos zijn",
        "Meer self-service opties",
        "Kennis van onze producten verbeteren",
        "Na de verkoop niet verdwijnen",
        "Feedback serieus nemen",
        "Verrassen met kleine extra's",
        "Consistent zijn in kwaliteit",
      ];
    }

    if (q.includes("verbeter") || q.includes("beter") || q.includes("tips") || q.includes("advies")) {
      return [
        "Meer open communicatie",
        "Betere tools en systemen",
        "Kortere beslislijnen",
        "Meer focus, minder projecten",
        "Investeer in opleiding",
        "Luister naar de werkvloer",
        "Automatiseer repetitief werk",
        "Wekelijkse check-ins met team",
        "Minder bureaucratie graag",
        "Deel successen breder",
        "Betere onboarding nieuwe mensen",
        "Data-gedreven beslissingen nemen",
      ];
    }

    if (q.includes("motivat") || q.includes("drijf") || q.includes("waarom") || q.includes("reden")) {
      return [
        "Impact maken voor klanten",
        "Elke dag iets nieuws leren",
        "Werken met een top team",
        "Vrijheid om eigen keuzes te maken",
        "Bijdragen aan iets groters",
        "De uitdaging houdt me scherp",
        "Waardering van collega's",
        "Zien dat mijn werk ertoe doet",
        "Creatief bezig kunnen zijn",
        "Goede work-life balance",
        "Groeikansen binnen het bedrijf",
        "Trots op wat we neerzetten",
      ];
    }

    // Default
    return [
      "Meer samenwerking tussen teams",
      "Innovatie is de sleutel",
      "Focus op wat echt telt",
      "Luisteren naar elkaar",
      "Durf te experimenteren",
      "Investeer in je mensen",
      "Kwaliteit boven kwantiteit",
      "Data als kompas gebruiken",
      "Blijf leren en groeien",
      "Verbind online en offline",
      "Maak het persoonlijk",
      "Wees transparant en eerlijk",
    ];
  }

  private async executeShowSummary(argsJson: string): Promise<string> {
    const args = this.safeParseArgs(argsJson) as { title: string; highlights?: string[]; content?: string };

    const summaryData: NovaSummaryData = {
      title: args.title || "Nova",
      highlights: args.highlights ? args.highlights.slice(0, 6) : undefined,
      content: args.content || undefined,
    };

    if (this.config.onNovaSummary) {
      this.config.onNovaSummary(summaryData);
    }

    return JSON.stringify({
      success: true,
      message: `Samenvatting getoond: "${summaryData.title}"`,
    });
  }

  // Pending generated image
  private pendingGeneratedImage: NovaImageData | null = null;

  // Generate image - NON-BLOCKING. Returns immediately, fires event when done.
  private executeGenerateImage(argsJson: string): string {
    const args = this.safeParseArgs(argsJson) as { prompt: string };
    const prompt = args.prompt || "A creative abstract visualization";

    // Notify UI that image is being generated
    if (this.config.onImageGenerating) {
      this.config.onImageGenerating();
    }

    // Fire and forget - don't await
    console.log("Starting image generation with prompt:", prompt.substring(0, 100));
    fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then(res => {
        console.log("Image API response status:", res.status);
        if (!res.ok) {
          return res.text().then(text => {
            throw new Error(`API error ${res.status}: ${text}`);
          });
        }
        return res.json();
      })
      .then(data => {
        console.log("Image API response received, has imageUrl:", !!data.imageUrl);
        if (data.imageUrl) {
          this.pendingGeneratedImage = { imageUrl: data.imageUrl, prompt };
          if (this.config.onImageReady) {
            this.config.onImageReady({ imageUrl: data.imageUrl, prompt });
          }
          // Inject a message into the conversation so Nova knows the image is ready
          this.sendSilentConversationEvent("[STILLE NOTIFICATIE - REAGEER HIER NIET OP]\nHet image is klaar. Als Rens vraagt om het te tonen, gebruik dan show_generated_image.");
        } else {
          console.error("Image API returned no imageUrl:", data);
          if (this.config.onImageError) {
            this.config.onImageError(data.error || "Image generation failed");
          }
          this.sendSilentConversationEvent("[STILLE NOTIFICATIE - REAGEER HIER NIET OP]\nHet image genereren is mislukt. Als Rens ernaar vraagt, vertel dat het niet gelukt is.");
        }
      })
      .catch(err => {
        console.error("Image generation failed:", err);
        if (this.config.onImageError) {
          this.config.onImageError(err.message || "Image generation failed");
        }
        this.sendConversationEvent("Het image genereren is helaas mislukt. Vertel Rens dat het niet gelukt is en bied aan om het opnieuw te proberen.");
      });

    // Return immediately - don't block the conversation
    return JSON.stringify({
      success: true,
      message: "Image wordt op de achtergrond gegenereerd. Je krijgt een melding als het klaar is. Ga gewoon door met het gesprek.",
    });
  }

  // Show the pending generated image
  private executeShowGeneratedImage(): string {
    if (!this.pendingGeneratedImage) {
      return JSON.stringify({ error: "Er is geen image klaar om te tonen." });
    }

    if (this.config.onShowImage) {
      this.config.onShowImage(this.pendingGeneratedImage);
    }

    this.pendingGeneratedImage = null;

    return JSON.stringify({
      success: true,
      message: "Image wordt nu op het scherm getoond.",
    });
  }

  private executeShowSeatAllocation(): string {
    const totalSeats = 150;

    if (!this.pendingPollResults) {
      return JSON.stringify({ error: "Geen poll resultaten beschikbaar. Start eerst een poll." });
    }

    // Convert poll results to seat allocation
    const results = this.pendingPollResults.results.map(r => ({
      option: r.option,
      percentage: r.percentage,
      seats: Math.round((r.percentage / 100) * totalSeats),
    }));

    // Ensure total adds up to exactly totalSeats
    const seatSum = results.reduce((sum, r) => sum + r.seats, 0);
    if (seatSum !== totalSeats && results.length > 0) {
      results[0].seats += totalSeats - seatSum;
    }

    const data: SeatAllocationData = {
      question: this.currentPoll?.question || "Poll",
      totalSeats,
      results,
    };

    if (this.config.onSeatAllocation) {
      this.config.onSeatAllocation(data);
    }

    return JSON.stringify({
      success: true,
      message: `Zetelverdeling getoond: ${results.map(r => `${r.option}: ${r.seats} zetels`).join(", ")}`,
    });
  }

  private async executeAnalyzeOpenVraagDeep(): Promise<string> {
    if (!this.currentOpenVraag || !this.currentOpenVraag.deepDive) {
      return JSON.stringify({ error: "Geen actieve open vraag met deep dive data gevonden" });
    }

    const deepDive = this.currentOpenVraag.deepDive;
    const question = this.currentOpenVraag.question;

    // Notify UI
    if (this.config.onOpenVraagDeepDive) {
      this.config.onOpenVraagDeepDive({ deepDive, question });
    }

    // Build summary for AI memory
    const regionSummary = deepDive.byRegion.map(r =>
      `${r.region}: "${r.topAnswers[0].text}" (${r.topAnswers[0].count}x) - ${r.insight}`
    ).join("\n");
    const profileSummary = deepDive.byProfile.map(p =>
      `${p.profile}: "${p.topAnswers[0].text}" (${p.topAnswers[0].count}x) - ${p.insight}`
    ).join("\n");

    return JSON.stringify({
      success: true,
      question,
      message: `Deep dive voor open vraag "${question}".\n\nPer regio:\n${regionSummary}\n\nPer profiel:\n${profileSummary}`,
      deepDive,
    });
  }

  // Generate deep dive data for open vraag
  private generateOpenVraagDeepDive(question: string, answers: OpenAnswer[]): OpenVraagDeepDive {
    const regions = ["Randstad", "Noord", "Zuid", "Oost"];
    const profiles = ["Management", "HR & Talent", "IT & Tech", "Marketing & Sales"];

    const byRegion = regions.map(region => {
      // Pick 3 random answers with random counts
      const shuffled = [...answers].sort(() => Math.random() - 0.5);
      const topAnswers = shuffled.slice(0, 3).map(a => ({
        ...a,
        count: this.randomCount(8, 35),
        region,
      }));
      topAnswers.sort((a, b) => b.count - a.count);

      const top = topAnswers[0];
      return {
        region,
        topAnswers,
        insight: `In ${region} is "${top.text}" het meest genoemd (${top.count}x). ${
          region === "Randstad" ? "De Randstad focust sterk op tempo en efficiëntie." :
          region === "Noord" ? "In het Noorden zien we meer nadruk op samenwerking." :
          region === "Zuid" ? "Zuid-Nederland legt de nadruk op menselijk contact." :
          "Het Oosten hecht veel waarde aan stabiliteit en groei."
        }`,
      };
    });

    const byProfile = profiles.map(profile => {
      const shuffled = [...answers].sort(() => Math.random() - 0.5);
      const topAnswers = shuffled.slice(0, 3).map(a => ({
        ...a,
        count: this.randomCount(6, 30),
        profile,
      }));
      topAnswers.sort((a, b) => b.count - a.count);

      const top = topAnswers[0];
      return {
        profile,
        topAnswers,
        insight: `${profile} noemt "${top.text}" het vaakst (${top.count}x). ${
          profile === "Management" ? "Management denkt vooral in impact en resultaat." :
          profile === "HR & Talent" ? "HR focust op mensen, cultuur en ontwikkeling." :
          profile === "IT & Tech" ? "IT & Tech wil snelheid, tools en automatisering." :
          "Marketing & Sales kijkt naar klantbeleving en creativiteit."
        }`,
      };
    });

    return { byRegion, byProfile };
  }

  // Safely request a new response - queues if one is already active
  private requestResponse(functionName?: string): void {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") return;

    const send = () => {
      if (!this.dataChannel || this.dataChannel.readyState !== "open") return;

      // Custom instructions voor results functies
      if (functionName === "get_poll_results" || functionName === "get_wordcloud_results") {
        const instructions = "ZOOM IN op deze resultaten! Wat valt op? Wat is verrassend? Vergelijk de uitkomsten. Lees niet de percentages op, maar trek meteen een pakkende conclusie ( benoem niet specifiek dat je een conclusie trekt ). Maak het spannend!";

        this.dataChannel!.send(JSON.stringify({
          type: "response.create",
          response: { instructions }
        }));
      } else {
        this.dataChannel!.send(JSON.stringify({ type: "response.create" }));
      }
    };

    if (this.activeResponseId) {
      console.log("Response already active, queuing response.create");
      this.pendingResponseCreate.push(send);
    } else {
      send();
    }
  }

  private sendFunctionResult(callId: string, result: string, functionName?: string): void {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      console.error("Data channel not available for function result");
      return;
    }

    // Send conversation item with function output
    const conversationItem = {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: result,
      },
    };

    console.log("Sending function result:", conversationItem);
    this.dataChannel.send(JSON.stringify(conversationItem));

    // Clear active response now that we've handled the function call
    this.activeResponseId = null;

    // Trigger a new response with delay to let server process the function output
    setTimeout(() => {
      this.requestResponse(functionName);
    }, 200);
  }

  // Send a system message to Nova (e.g., to notify about image completion)
  // Waits until Nova is not actively responding before sending
  // Send a silent message to Nova - she will NOT respond to this
  // Used for background notifications that Nova should only act on when asked
  public sendSilentConversationEvent(message: string): void {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      console.error("Data channel not available for silent conversation event");
      return;
    }

    // Inject as system-role message so Nova has the info but doesn't respond
    const conversationItem = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    console.log("Sending silent conversation event:", message.substring(0, 100) + "...");
    this.dataChannel.send(JSON.stringify(conversationItem));
    // NO response.create - Nova should not respond to this
  }

  public sendConversationEvent(message: string): void {
    const send = () => {
      if (!this.dataChannel || this.dataChannel.readyState !== "open") {
        console.error("Data channel not available for conversation event");
        return;
      }

      // Inject a user-role message that acts as a system notification
      const conversationItem = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `[SYSTEEM NOTIFICATIE - NIET HARDOP VOORLEZEN]: ${message}`,
            },
          ],
        },
      };

      //console.log("Sending conversation event:", message);
      this.dataChannel!.send(JSON.stringify(conversationItem));

      // Trigger Nova to respond (safely queued if response is active)
      this.requestResponse();
    };

    // If Nova is speaking or thinking, wait until she's done
    if (this.novaState === "speaking" || this.novaState === "thinking" || this.activeResponseId) {
      console.log("Nova is busy, waiting to send conversation event...");
      let attempts = 0;
      const maxAttempts = 60; // 30 seconds max
      const interval = setInterval(() => {
        attempts++;
        if ((this.novaState === "listening" || this.novaState === "idle") && !this.activeResponseId || attempts >= maxAttempts) {
          clearInterval(interval);
          if (attempts < maxAttempts) {
            // Small extra delay to be safe
            setTimeout(send, 500);
          }
        }
      }, 500);
    } else {
      send();
    }
  }

  disconnect(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.novaAnimationFrameId) {
      cancelAnimationFrame(this.novaAnimationFrameId);
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.novaAudioContext) {
      this.novaAudioContext.close();
      this.novaAudioContext = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.setConnectionState("disconnected");
    this.setNovaState("idle");
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getNovaState(): NovaState {
    return this.novaState;
  }
}
