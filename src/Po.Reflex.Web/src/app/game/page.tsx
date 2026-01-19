import type { Metadata } from "next";
import { GameClient } from "@/components/game-client";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "PoReflex - Game",
  description: "Test your reaction time",
};

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ nickname?: string }>;
}) {
  const params = await searchParams;
  
  // Validate nickname on server
  if (!params.nickname || params.nickname.trim().length < 3) {
    redirect("/");
  }

  return <GameClient nickname={params.nickname} />;
}
