interface StopButtonProps {
  onStop: () => void;
  disabled: boolean;
}

/**
 * Large touch-friendly stop button for the game control zone.
 * Responds to both click and touch events for mobile play.
 */
export function StopButton({ onStop, disabled }: StopButtonProps) {
  const handleClick = () => {
    if (!disabled) onStop();
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
