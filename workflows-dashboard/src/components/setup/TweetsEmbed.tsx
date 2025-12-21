"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Tweet } from "react-tweet";
import { Card, CardContent, CrossHatchBackground, Button } from "@/components";
import { Twitter, ChevronLeft, ChevronRight } from "lucide-react";

interface TweetsEmbedProps {
  tweetIds: string[];
  title?: string;
}

export function TweetsEmbed({
  tweetIds,
  title = "Community Feedback"
}: TweetsEmbedProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: tweetIds.length > 1,
    slidesToScroll: 1,
    skipSnaps: false
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) {
        emblaApi.scrollTo(index);
      }
    },
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;

    const updateSelectedIndex = () => {
      const snapIndex = emblaApi.selectedScrollSnap();
      setSelectedIndex(snapIndex);
    };

    updateSelectedIndex();
    emblaApi.on("select", updateSelectedIndex);
    emblaApi.on("reInit", updateSelectedIndex);

    return () => {
      emblaApi.off("select", updateSelectedIndex);
      emblaApi.off("reInit", updateSelectedIndex);
    };
  }, [emblaApi]);

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
          {tweetIds.length > 1 && (
            <span className="text-xs text-gray-600">
              {selectedIndex + 1} / {tweetIds.length}
            </span>
          )}
        </div>

        <div className="relative" data-theme="light">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {tweetIds.map((tweetId, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div key={tweetId} className="flex-shrink-0 w-[500px] px-2">
                    <div
                      className={`rounded-lg border p-3 bg-white h-[400px] overflow-y-auto transition-all duration-300 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
                        isSelected
                          ? "border-2 border-orange-200 shadow-lg scale-100"
                          : "border border-gray-200 scale-90 opacity-70"
                      }`}
                    >
                      <Tweet id={tweetId} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {tweetIds.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-1.5 h-8 w-8 shadow-md bg-white/95 hover:bg-white border border-gray-200"
                aria-label="Previous tweet"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={scrollNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-1.5 h-8 w-8 shadow-md bg-white/95 hover:bg-white border border-gray-200"
                aria-label="Next tweet"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {tweetIds.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {tweetIds.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === selectedIndex
                      ? "w-6 bg-orange-600"
                      : "w-1.5 bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to tweet ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
