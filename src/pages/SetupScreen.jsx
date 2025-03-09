import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";

const SetupScreen = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const job_id = searchParams.get("job_id");
  const interview_id = searchParams.get("interview_id");
  const navigate = useNavigate();
  const webcamRef = useRef(null);

  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [micLevel, setMicLevel] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);

  // Handle camera permissions
  const handleUserMedia = () => {
    setError(null);
  };

  const handleUserMediaError = (err) => {
    console.error("Error accessing media:", err);
    setError("Could not access camera/microphone. Please check permissions.");
  };

  // Get available camera devices
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Error getting devices:", err);
      }
    }

    if (videoEnabled) {
      getDevices();
    }
  }, [videoEnabled, selectedDevice]);

  // Microphone test function
  useEffect(() => {
    let audioContext;
    let analyser;
    let mic;
    let dataArray;
    let animationFrameId;

    if (audioEnabled) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          mic = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          mic.connect(analyser);

          dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkMicLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const average =
              dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setMicLevel(Math.min(average * 2, 100)); // Amplify for better visibility
            animationFrameId = requestAnimationFrame(checkMicLevel);
          };
          checkMicLevel();
        })
        .catch((err) => {
          console.error("Microphone error:", err);
          setError(
            "Microphone access denied. Please check browser permissions."
          );
        });
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext) audioContext.close();
    };
  }, [audioEnabled]);

  const getVideoConstraints = () => {
    return {
      width: 1280,
      height: 720,
      deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
      facingMode: "user",
    };
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-black p-6">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-2 text-white text-center">
          Interview Instructions
        </h1>
        <p className="text-white mb-6 text-center">
          Let's make sure your equipment is ready for the interview
        </p>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          {/* Equipment Check Section */}
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
              <span className="mr-2">🎥</span> Equipment Check
            </h2>

            {/* Camera Preview */}
            <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center mb-4">
              {error ? (
                <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Try Again
                  </button>
                </div>
              ) : videoEnabled ? (
                <Webcam
                  ref={webcamRef}
                  className="w-full h-full object-cover"
                  audio={audioEnabled}
                  videoConstraints={getVideoConstraints()}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                  mirrored={true}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <span className="text-4xl mb-2">📷</span>
                  <p className="text-gray-300 font-medium">
                    Camera is turned off
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Click "Turn On Video" to preview yourself
                  </p>
                </div>
              )}
            </div>

            {/* Camera Selection */}
            {videoEnabled && videoDevices.length > 1 && (
              <div className="mb-4">
                <label
                  htmlFor="camera-select"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Camera:
                </label>
                <select
                  id="camera-select"
                  value={selectedDevice || ""}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                >
                  {videoDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Toggle Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors ${
                  videoEnabled
                    ? "bg-white text-red-600 border border-red-600 hover:bg-red-50"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                }`}
              >
                <span className="mr-2">{videoEnabled ? "🎥" : "📷"}</span>
                {videoEnabled ? "Turn Off Video" : "Turn On Video"}
              </button>

              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors ${
                  audioEnabled
                    ? "bg-white text-red-600 border border-red-600 hover:bg-red-50"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                }`}
              >
                <span className="mr-2">{audioEnabled ? "🎤" : "🔇"}</span>
                {audioEnabled ? "Turn Off Mic" : "Turn On Mic"}
              </button>
            </div>

            {/* Microphone Test (Visualizer) */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-700 font-medium">Microphone Level:</p>
                <span
                  className={`text-sm font-medium ${
                    micLevel > 30 ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {audioEnabled
                    ? micLevel > 5
                      ? "Detecting audio"
                      : "Speak to test"
                    : "Microphone off"}
                </span>
              </div>
              <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    micLevel > 60
                      ? "bg-green-500"
                      : micLevel > 30
                      ? "bg-green-400"
                      : "bg-gray-400"
                  }`}
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              {audioEnabled && micLevel < 5 && (
                <p className="text-sm text-orange-500 mt-1">
                  Not detecting audio. Try speaking or check if your microphone
                  is working.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 animate-fadeIn">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
                <span className="mr-2">📝</span> Interview Tips
              </h2>

              <div className="space-y-4">
                <div className="bg-teal-50 p-4 rounded-lg">
                  <h3 className="font-bold text-teal-800 mb-2">
                    Before You Begin:
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Find a quiet location with minimal background noise</li>
                    <li>Ensure you have a stable internet connection</li>
                    <li>
                      Position yourself in a well-lit area with light facing
                      you, not behind you
                    </li>
                    <li>
                      Set your camera at eye level for the most professional
                      appearance
                    </li>
                    <li>
                      Dress professionally as you would for an in-person
                      interview
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-2">
                    During the Interview:
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>
                      Maintain eye contact by looking at your camera (not the
                      screen)
                    </li>
                    <li>Speak clearly and at a moderate pace</li>
                    <li>Listen carefully to questions before responding</li>
                    <li>Avoid interrupting the interviewer</li>
                    <li>
                      Use the STAR method (Situation, Task, Action, Result) for
                      behavioral questions
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Start Interview Button */}
            <button
              onClick={() =>
                navigate(
                  `/interview?job_id=${job_id}&interview_id=${interview_id}`
                )
              }
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 shadow-lg flex items-center justify-center"
            >
              Start Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
