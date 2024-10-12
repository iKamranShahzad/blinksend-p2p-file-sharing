import "./index.css";

function App() {
  return (
    <div className="gradient-background">
      <header className="relative z-10 flex flex-col items-center justify-center gap-1">
        <img
          className="mt-2 w-32 sm:w-32 md:w-44 lg:w-52 xl:w-60 2xl:w-64 3xl:w-72"
          src="/Logo.webp"
          alt="BlinkSend Logo"
        ></img>
        <p className="mt-1 text-center text-sm sm:text-sm md:text-lg lg:text-lg">
          Instant, Secure, and Limitless File Sharing at the Blink of an Eye
        </p>
      </header>
    </div>
  );
}

export default App;
