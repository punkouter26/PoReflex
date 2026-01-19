"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NicknameInput } from "./nickname-input";

interface HomeClientProps {
  isApiHealthy: boolean;
}

export function HomeClient({ isApiHealthy }: HomeClientProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [isNicknameValid, setIsNicknameValid] = useState(false);

  const canPlay = isNicknameValid && isApiHealthy;

  const handleValidChange = useCallback((isValid: boolean) => {
    setIsNicknameValid(isValid);
  }, []);

  const handleStartGame = useCallback(() => {
    if (canPlay) {
      router.push(`/game?nickname=${encodeURIComponent(nickname)}`);
    }
  }, [canPlay, nickname, router]);

  return (
    <div className="nickname-form">
      <NicknameInput
        value={nickname}
        onChange={setNickname}
        onValidChange={handleValidChange}
      />

      <button
        className="btn-play"
        onClick={handleStartGame}
        disabled={!canPlay}
        data-testid="start-button"
      >
        {isApiHealthy ? "Play" : "Offline"}
      </button>
    </div>
  );
}
