"use client";

import { Card, CardContent, CrossHatchBackground } from "@/components";
import { ExternalLink, Twitter } from "lucide-react";

interface TweetsEmbedProps {
  tweetIds: string[];
  title?: string;
}

export function TweetsEmbed({
  tweetIds,
  title = "Community Feedback"
}: TweetsEmbedProps) {
  if (!tweetIds || tweetIds.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm relative overflow-hidden">
      <CrossHatchBackground pattern="large" opacity={0.02} />
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Twitter className="w-4 h-4 text-[#1DA1F2]" />
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tweetIds.map((tweetId, index) => (
            <a
              key={tweetId}
              href={`https://x.com/i/web/status/${tweetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-orange-100 bg-white p-4 transition-colors hover:border-orange-300 hover:bg-orange-50/40"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  Tweet {index + 1}
                </span>
                <ExternalLink className="h-4 w-4 text-gray-400 transition-colors group-hover:text-orange-600" />
              </div>
              <p className="text-xs leading-relaxed text-gray-600">
                Open the original tweet on X.
              </p>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
