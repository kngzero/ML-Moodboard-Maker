import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function Review() {
  const [text, setText] = useState("");

  const submitReview = () => {
    const username = window.location.hostname.includes("github.io")
      ? window.location.hostname.split(".")[0]
      : "openai";
    const repo = "ML-Moodboard-Maker";
    const url = `https://github.com/${username}/${repo}/issues/new?title=${encodeURIComponent(
      "Review: ML Moodboard Maker"
    )}&body=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="review" className="text-sm">
            Share your thoughts
          </Label>
          <textarea
            id="review"
            className="w-full rounded-md border border-neutral-300 bg-transparent p-2 text-sm"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <Button onClick={submitReview} disabled={!text.trim()}>
          Submit on GitHub
        </Button>
      </CardContent>
    </Card>
  );
}

