"use client";

interface StopButtonProps {
  onStop: () => void;
  disabled: boolean;
}

export function StopButton({ onStop, disabled }: StopButtonProps) {
  const handleClick = () => {
    if (!disabled) {
      onStop();
    }
  };

  return (
    <button
      className={`stop-button ${disabled ? "disabled" : ""}`}
      onClick={handleClick}
      onTouchStart={handleClick}
      disabled={disabled}
      data-testid="stop-button"
    >
      <span className="stop-text">STOP</span>
    </button>
  );
}
