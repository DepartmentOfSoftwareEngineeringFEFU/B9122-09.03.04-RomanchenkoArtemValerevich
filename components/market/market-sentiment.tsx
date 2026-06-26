"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export function MarketSentiment() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Social Sentiment Analysis</CardTitle>
          <CardDescription>AI-driven analysis of Twitter (X), Reddit, and Crypto News outlets.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Fear & Greed Index</span>
                <span className="font-bold text-emerald-500">78 (Extreme Greed)</span>
              </div>
              <Progress
                value={78}
                className="h-2 bg-slate-800"
                indicatorClassName="bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg border border-slate-800 p-3 bg-slate-900/50">
                <div className="text-2xl font-bold text-blue-500">8.4k</div>
                <div className="text-xs text-muted-foreground">Social Mentions (24h)</div>
              </div>
              <div className="rounded-lg border border-slate-800 p-3 bg-slate-900/50">
                <div className="text-2xl font-bold text-emerald-500">65%</div>
                <div className="text-xs text-muted-foreground">Positive Sentiment</div>
              </div>
              <div className="rounded-lg border border-slate-800 p-3 bg-slate-900/50">
                <div className="text-2xl font-bold text-violet-500">High</div>
                <div className="text-xs text-muted-foreground">Viral Probability</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Key Topics</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  #BitcoinETF
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  #BullRun
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  #Halving
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  #Inflation
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>News Sentiment</CardTitle>
          <CardDescription>Latest market impacting news</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-start space-x-3 pb-4 border-b border-slate-800 last:border-0 last:pb-0"
              >
                <div
                  className={`h-2 w-2 mt-2 rounded-full ${i === 1 ? "bg-emerald-500" : i === 2 ? "bg-yellow-500" : "bg-blue-500"}`}
                />
                <div>
                  <p className="text-sm font-medium leading-none mb-1">
                    {i === 1
                      ? "SEC Approves New Crypto Regulation Framework"
                      : i === 2
                        ? "Institutional Inflows reach record high"
                        : "Tech Giants integrate blockchain payments"}
                  </p>
                  <p className="text-xs text-muted-foreground">2 hours ago • CoinDesk</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
