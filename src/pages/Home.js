import React, { useState, useEffect } from "react";
import {
  Upload,
  FileAudio,
  Download,
  Copy,
  Trash2,
  Loader,
  History,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

const Home = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionHistory, setTranscriptionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (max 1GB)
      if (file.size > 1024 * 1024 * 1024) {
        toast.error("File size must be less than 1GB");
        return;
      }

      // Validate file format
      const allowedFormats = ["wav", "mp3", "m4a", "flac", "ogg", "webm"];
      const fileExt = file.name.toLowerCase().split(".").pop();
      if (!allowedFormats.includes(fileExt)) {
        toast.error(
          "Please select a valid audio file (MP3, WAV, M4A, FLAC, OGG, or WEBM)"
        );
        return;
      }

      setSelectedFile(file);
      setTranscript(""); // Clear previous transcript
    }
  };

  const transcribeAudio = async () => {
    if (!selectedFile) {
      toast.error("Please select an audio file first");
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("audio", selectedFile);

    try {
      const response = await axios.post(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        }/api/speech/transcribe/web`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setTranscript(response.data.transcription.text);
        toast.success("Transcription completed successfully!");

        // Refresh history after successful transcription
        fetchTranscriptionHistory();
      } else {
        toast.error("Transcription failed");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      let errorMessage = "Transcription failed";

      if (error.response?.status === 401) {
        errorMessage =
          "Invalid API key. Please check your Deepgram credentials.";
      } else if (error.response?.status === 413) {
        errorMessage = "Audio file too large. Please use a smaller file.";
      } else if (error.response?.status === 400) {
        errorMessage =
          "Invalid audio format. Please use MP3, WAV, M4A, or FLAC.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      toast.success("Text copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy text");
    }
  };

  const downloadTranscript = () => {
    const element = document.createElement("a");
    const file = new Blob([transcript], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "transcript.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Transcript downloaded!");
  };

  const clearAll = () => {
    setSelectedFile(null);
    setTranscript("");
    // Reset file input
    const fileInput = document.getElementById("audio-upload");
    if (fileInput) fileInput.value = "";
    toast.success("All cleared!");
  };

  const fetchTranscriptionHistory = async () => {
    try {
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        }/api/transcriptions`
      );
      setTranscriptionHistory(response.data);
    } catch (error) {
      console.error("Error fetching transcription history:", error);
    }
  };

  const deleteTranscription = async (id) => {
    try {
      await axios.delete(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:3001"
        }/api/transcriptions/${id}`
      );
      toast.success("Transcription deleted successfully!");
      fetchTranscriptionHistory();
    } catch (error) {
      console.error("Error deleting transcription:", error);
      toast.error("Failed to delete transcription");
    }
  };

  const loadTranscription = (transcription) => {
    setTranscript(transcription.original_text);
    setShowHistory(false);
    toast.success("Transcription loaded!");
  };

  useEffect(() => {
    fetchTranscriptionHistory();
  }, []);

  return (
    <div className=" h-screen items-center ">
      {/* Header */}
      <div className="h-20 w-full bg-white flex items-center shadow-sm px-4">
        <div>
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaSBVldkWbdEO2WZIAyYhrO61c4EHQZA9krnYt1BXUhOF0ipz3382C-dhQauu32aegtP8&usqp=CAU"
            height="50px"
            width="50px"
            className="rounded-xl"
          />
        </div>
        <div className="flex-1 text-center">
          <h2 className="text-2xl font-bold text-[#6F3FAA]">Speech To Text</h2>
        </div>
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#6F3FAA] text-white rounded-lg hover:bg-[#8352C1] transition-colors"
          >
            <History className="h-5 w-5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Speech-to-Text Section */}
      <div className="card h-[550px] items-center w-[800px] mx-auto mt-5">
        <p className="text-center text-gray-600 mb-10 mt-[35px]">
          Upload your audio file below and get accurate text transcription in
          seconds
        </p>

        {/* File Upload Section */}
        <div className="mb-8  justify-center flex place-content-center">
          <div className="border-2 h-[300px] w-[500px] justify-center border-dashed border-gray-300  rounded-lg p-8 text-center hover:border-[#8352C1] transition-colors">
            <Upload className="h-14 w-14 text-gray-400 mx-auto mt-2 mb-8" />
            <div>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className="btn-primary cursor-pointer text-lg font-medium text-white px-4 py-3"
              >
                Upload Audio File
              </label>
              {selectedFile && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <FileAudio className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">
                    {selectedFile.name}
                  </span>
                  <p className="text-green-600 text-sm mt-1">
                    File size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
              <p className="text-gray-600  mt-6">
                Supported formats: MP3, WAV, M4A, OGG, and more
              </p>
              <p className="text-gray-600">(Max 1GB)</p>
            </div>
          </div>
        </div>

        {/* Convert Button */}
        {selectedFile && (
          <div className="text-center mb-8">
            <button
              onClick={transcribeAudio}
              disabled={isProcessing}
              className="btn-primary text-lg px-8 py-3 flex items-center space-x-2 mx-auto mb-8"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Transcribing...</span>
                </>
              ) : (
                <>
                  <FileAudio className="h-5 w-5" />
                  <span>Convert to Text</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Transcription Result
            </h3>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {transcript}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <button
                onClick={copyToClipboard}
                className="btn-secondary flex items-center space-x-2"
              >
                <Copy className="h-5 w-5" />
                <span>Copy Text</span>
              </button>

              <button
                onClick={downloadTranscript}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span>Download</span>
              </button>

              <button
                onClick={clearAll}
                className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-5 w-5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Transcription History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {transcriptionHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No transcriptions found
              </p>
            ) : (
              <div className="space-y-4">
                {transcriptionHistory.map((transcription) => (
                  <div
                    key={transcription.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {transcription.filename}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => loadTranscription(transcription)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteTranscription(transcription.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">
                      {new Date(transcription.created_at).toLocaleString()}
                    </p>
                    <p className="text-gray-700 text-sm line-clamp-2">
                      {transcription.original_text.substring(0, 150)}
                      {transcription.original_text.length > 150 && "..."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
