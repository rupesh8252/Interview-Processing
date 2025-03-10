import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

const VideoInterviewApp = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const interview_id = searchParams.get("interview_id");
  const job_id = searchParams.get("job_id");
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("idle"); // idle, recording, processing
  const [recordings, setRecordings] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  // Text-to-speech related states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [readingCountdown, setReadingCountdown] = useState(10);
  const buttonRef = useRef(null);

  useEffect(() => {
    // Only setup the auto-click timer when a new question is ready to be answered
    // and we're not currently recording or processing
    if (recordingStatus === "idle" && !reviewMode && !interviewComplete) {
      const timer = setTimeout(() => {
        if (buttonRef.current) {
          buttonRef.current.click(); // Automatically triggers the click event
        }
      }, 10000); // 5 seconds delay

      return () => clearTimeout(timer); // Cleanup timeout on unmount or state change
    }
  }, [currentQuestionIndex, recordingStatus, reviewMode, interviewComplete]);

  useEffect(() => {
    let timer;
    // Only run countdown when a new question is loaded and we're not recording
    if (
      recordingStatus === "idle" &&
      !reviewMode &&
      !interviewComplete &&
      readingCountdown > 0
    ) {
      timer = setInterval(() => {
        setReadingCountdown((prev) => prev - 1);
      }, 1000);
    } else if (readingCountdown === 0) {
      // Reset the countdown for the next question
      setReadingCountdown(10);
    }

    return () => clearInterval(timer);
  }, [
    recordingStatus,
    reviewMode,
    interviewComplete,
    readingCountdown,
    currentQuestionIndex,
  ]);

  // Reset the countdown when moving to a new question
  useEffect(() => {
    setReadingCountdown(10);
  }, [currentQuestionIndex]);

  useEffect(() => {
    getQuestions();
  }, []);

  const getQuestions = async () => {
    try {
      const response = await axios.get(
        `https://ai-interview-urf8.onrender.com/openings/questions/${job_id}/`
      );

      console.log("Questions API response:", response.data); // Add this line to debug

      if (response.data && Array.isArray(response.data.questions)) {
        setQuestions(response.data.questions);
      } else if (response.data && Array.isArray(response.data)) {
        setQuestions(response.data);
      } else {
        console.error("Unexpected API response format:", response.data);
        // Set a default question for testing if API fails
        setQuestions(["Tell me about yourself and your experience."]);
      }
    } catch (error) {
      console.error("❌ Error fetching questions:", error);
      // Set a default question array as fallback
      setQuestions(["Tell me about yourself and your experience."]);
    }
  };

  useEffect(() => {
    if ("speechSynthesis" in window) {
      // This ensures voices are loaded before we try to use them
      window.speechSynthesis.onvoiceschanged = () => {
        setSpeechAvailable(true);
      };

      // Initial check
      if (window.speechSynthesis.getVoices().length > 0) {
        setSpeechAvailable(true);
      }
    } else {
      console.error("Text-to-speech is not supported in this browser");
    }
  }, []);

  useEffect(() => {
    if (
      speechAvailable &&
      !reviewMode &&
      recordingStatus === "idle" &&
      questions.length > 0
    ) {
      speakQuestion(questions[currentQuestionIndex]);
    }
  }, [
    currentQuestionIndex,
    recordingStatus,
    reviewMode,
    speechAvailable,
    questions,
  ]);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      setSpeechAvailable(true);
    } else {
      console.error("Text-to-speech is not supported in this browser");
    }

    const startCamera = async () => {
      setCameraLoading(true);
      try {
        const streamData = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(streamData);
        setCameraLoading(false);
      } catch (error) {
        console.error("❌ Error accessing webcam:", error);
        setCameraLoading(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      // Cancel any ongoing speech when component unmounts
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream && !reviewMode) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, reviewMode]);

  useEffect(() => {
    let timer;
    if (isRecording && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRecording) {
      stopRecording();
    }
    return () => clearInterval(timer);
  }, [isRecording, timeLeft]);

  // Auto-speak question when it changes
  useEffect(() => {
    if (speechAvailable && !reviewMode && recordingStatus === "idle") {
      speakQuestion(questions[currentQuestionIndex]);
    }
  }, [currentQuestionIndex, recordingStatus, reviewMode, speechAvailable]);

  //   const speakQuestion = (text) => {
  //     if (!speechAvailable) return;

  //     // Cancel any ongoing speech
  //     window.speechSynthesis.cancel();

  //     const utterance = new SpeechSynthesisUtterance(text);

  //     // Set speech properties
  //     utterance.rate = 1.0; // Speed: 0.1 to 10
  //     utterance.pitch = 1.0; // Pitch: 0 to 2
  //     utterance.volume = 1.0; // Volume: 0 to 1

  //     // Optional: You can set a specific voice
  //     const voices = window.speechSynthesis.getVoices();
  //     // Try to find a female English voice for a more natural interview experience
  //     const preferredVoice = voices.find(
  //       (voice) =>
  //         voice.name.includes("female") ||
  //         voice.name.includes("Female") ||
  //         voice.name.includes("Samantha")
  //     );

  //     if (preferredVoice) {
  //       utterance.voice = preferredVoice;
  //     }

  //     // Events to track speaking status
  //     utterance.onstart = () => setIsSpeaking(true);
  //     utterance.onend = () => setIsSpeaking(false);
  //     utterance.onerror = () => setIsSpeaking(false);

  //     // Speak the text
  //     window.speechSynthesis.speak(utterance);
  //   };

  const speakQuestion = (text) => {
    if (!text || !speechAvailable) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set speech properties
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Get available voices
    const voices = window.speechSynthesis.getVoices();

    // Try to find a female English voice
    const preferredVoice = voices.find(
      (voice) =>
        (voice.name.includes("female") ||
          voice.name.includes("Female") ||
          voice.name.includes("Samantha")) &&
        voice.lang.includes("en")
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Events to track speaking status
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Speak the text
    window.speechSynthesis.speak(utterance);
  };
  const handleStartAnswering = () => {
    // Stop any ongoing speech before starting recording
    if (speechAvailable) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    // Start recording immediately without countdown
    startRecording();
    setRecordingStatus("recording");
  };

  const startRecording = () => {
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    setRecordedChunks([]);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.start();
    setIsRecording(true);
    setTimeLeft(60);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStatus("processing");
    }
  };

  useEffect(() => {
    if (recordingStatus === "processing" && recordedChunks.length > 0) {
      processRecording();
    }
  }, [recordedChunks, recordingStatus]);

  const processRecording = async () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const videoUrl = URL.createObjectURL(blob);

    // Store recording with question info
    const newRecording = {
      questionIndex: currentQuestionIndex,
      question: questions[currentQuestionIndex],
      videoUrl: videoUrl,
      blob: blob,
    };

    setRecordings((prev) => [...prev, newRecording]);

    // Upload recording to server
    uploadRecording(blob, questions[currentQuestionIndex]);

    // Move to next question automatically
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
        setTimeLeft(60);
        setRecordingStatus("idle");
        setRecordedChunks([]);
      }, 1000);
    } else {
      setTimeout(() => {
        setInterviewComplete(true);
      }, 1000);
    }
  };

  const uploadRecording = async (blob, question) => {
    const formData = new FormData();
    formData.append("video_file", blob);
    formData.append("question", question);

    try {
      const response = await axios.post(
        `https://ai-interview-urf8.onrender.com/call/process/?interview_id=${interview_id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      console.log("✅ Successfully uploaded:", response.data);
    } catch (error) {
      console.error("❌ Upload failed:", error);
    }
  };

  // Format time to display as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Progress indicator
  const progress = ((currentQuestionIndex + 1) / questions?.length) * 100;

  const exitReviewMode = async () => {
    setReviewMode(false);
    // Restart camera when exiting review mode
    try {
      const streamData = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(streamData);
      if (videoRef.current) {
        videoRef.current.srcObject = streamData;
      }
    } catch (error) {
      console.error("❌ Error accessing webcam:", error);
    }
  };

  const ReviewComponent = () => {
    const currentRecording = recordings[currentReviewIndex];

    useEffect(() => {
      if (videoRef.current && currentRecording) {
        videoRef.current.src = currentRecording.videoUrl;
        videoRef.current.load();
      }
    }, [currentReviewIndex]);

    // Function to speak the current review question
    const speakReviewQuestion = () => {
      if (speechAvailable && currentRecording) {
        speakQuestion(currentRecording.question);
      }
    };

    return (
      <div className="flex flex-col bg-gray-800 bg-opacity-80 rounded-2xl p-6 shadow-2xl mb-6">
        <h2 className="text-2xl font-bold mb-4">Reviewing Your Answers</h2>

        <div className="relative w-full rounded-xl overflow-hidden shadow-xl mb-4 bg-black aspect-video">
          <video
            ref={videoRef}
            controls
            className="w-full h-full object-cover"
          />
        </div>

        <div className="bg-gray-700 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">
              Question {currentRecording.questionIndex + 1}:
            </h2>
            {speechAvailable && (
              <button
                onClick={speakReviewQuestion}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                disabled={isSpeaking}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m0 0l-2.828 2.828-2.828-2.828m2.828 2.828a9 9 0 010-12.728"
                  />
                </svg>
                {isSpeaking ? "Speaking..." : "Speak Question"}
              </button>
            )}
          </div>
          <p className="text-xl">{currentRecording.question}</p>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() =>
              setCurrentReviewIndex((prev) => Math.max(0, prev - 1))
            }
            disabled={currentReviewIndex === 0}
            className={`px-6 py-3 rounded-lg flex items-center ${
              currentReviewIndex === 0
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gray-700 hover:bg-gray-600 text-white transition"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Previous Answer
          </button>
          <button
            onClick={() =>
              setCurrentReviewIndex((prev) =>
                Math.min(recordings.length - 1, prev + 1)
              )
            }
            disabled={currentReviewIndex === recordings.length - 1}
            className={`px-6 py-3 rounded-lg flex items-center ${
              currentReviewIndex === recordings.length - 1
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white transition"
            }`}
          >
            Next Answer
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <button
          onClick={exitReviewMode}
          className="mt-6 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
        >
          Back to Interview
        </button>
      </div>
    );
  };

  if (interviewComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-black text-white p-6">
        <div className="max-w-2xl w-full bg-gray-800 bg-opacity-80 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-6 text-center">
            🎉 Interview Completed!
          </h1>
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <p className="text-center text-lg mb-6">
            Thank you for completing the video interview. Your responses have
            been successfully recorded and submitted.
          </p>
          <p className="text-center text-lg mb-8">
            Our team will review your answers and get back to you soon!
          </p>
        </div>
      </div>
    );
  }

  if (reviewMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-black text-white p-6">
        <div className="max-w-4xl w-full">
          <ReviewComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-black text-white p-6">
      <div className="max-w-4xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            <span className="text-blue-400">AI Powered</span> Interview
          </h1>
          <div className="flex items-center">
            <div className="text-sm mr-2">Progress:</div>
            <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="ml-2 text-sm">
              {currentQuestionIndex + 1}/{questions?.length}
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-white bg-opacity-80 rounded-2xl p-6 shadow-2xl mb-6">
          <div className="relative w-full rounded-xl overflow-hidden shadow-xl mb-4 bg-black aspect-video">
            {cameraLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : null}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center bg-red-500 bg-opacity-80 px-3 py-1 rounded-full">
                <div className="w-3 h-3 rounded-full bg-red-100 mr-2 animate-pulse"></div>
                <span className="text-sm font-medium">Recording</span>
              </div>
            )}
          </div>

          <div className="bg-gray-700 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">
                Question {currentQuestionIndex + 1}:
              </h2>
              {speechAvailable && recordingStatus === "idle" && (
                <button
                  onClick={() => speakQuestion(questions[currentQuestionIndex])}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                  disabled={isSpeaking}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m0 0l-2.828 2.828-2.828-2.828m2.828 2.828a9 9 0 010-12.728"
                    />
                  </svg>
                  {isSpeaking ? "Speaking..." : "Speak Question"}
                </button>
              )}
            </div>
            <p className="text-xl">{questions[currentQuestionIndex]}</p>
            {recordingStatus === "idle" && readingCountdown > 0 && (
              <div className="mt-2 text-amber-400 font-bold animate-pulse">
                Starting automatically in {readingCountdown} seconds...
              </div>
            )}
          </div>

          {recordingStatus === "idle" ? (
            <div className="flex flex-col items-center">
              <button
                ref={buttonRef}
                onClick={handleStartAnswering}
                disabled={isRecording}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 transition transform hover:scale-105 shadow-lg flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Start Answering
              </button>
              <p className="mt-2 text-black text-sm">
                You'll have up to 60 seconds to answer
              </p>
            </div>
          ) : recordingStatus === "recording" ? (
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold mb-2 text-red-400">
                {formatTime(timeLeft)}
              </div>
              <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all duration-1000"
                  style={{ width: `${(timeLeft / 60) * 100}%` }}
                ></div>
              </div>
              <button
                onClick={stopRecording}
                className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                I'm Finished
              </button>
            </div>
          ) : recordingStatus === "processing" ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VideoInterviewApp;
