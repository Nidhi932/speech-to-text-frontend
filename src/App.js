import React from "react";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";

function App() {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <main className="">
        <Home />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: "#363636", color: "#fff" },
        }}
      />
    </div>
  );
}

export default App;
