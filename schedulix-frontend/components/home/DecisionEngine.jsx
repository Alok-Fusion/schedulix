"use client";

import { ArrowRight, BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";

const nodes = ({ appointment, insight, metrics, recommendation, selectedSlot }) => [
  {
    title: "Signal intake",
    body: appointment?.title
      ? `${appointment.title}, provider preference, date, and live slot pressure enter the engine together.`
      : "Service, provider preference, and live slot pressure enter the engine together."
  },
  {
    title: "Risk screen",
    body: selectedSlot
      ? `The engine checks whether ${new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} collides with another booking or a full queue.`
      : "Each slot is screened for queue pressure, payment rules, and booking conflicts."
  },
  {
    title: "Recommendation",
    body: recommendation
      ? `${new Date(recommendation.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} surfaces first because it is faster through the queue.`
      : "The engine waits until a clean recommendation is available."
  },
  {
    title: "System action",
    body: `${insight} Cancellation watch is holding at ${metrics.cancellationRate}%.`
  }
];

export default function DecisionEngine({
  appointment,
  insight,
  metrics,
  recommendation,
  selectedSlot
}) {
  return (
    <section className="page-card p-5 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-3 border-b border-line/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">How Schedulix thinks</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            The system does not just list times. It reasons through pressure, fit, and risk before surfacing a path.
          </p>
        </div>
        <span className="status-pill">
          <BrainCircuit size={14} />
          Decision engine
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {nodes({ appointment, insight, metrics, recommendation, selectedSlot }).map(
          (node, index, items) => (
            <div key={node.title} className="relative rounded-[24px] border border-line bg-panel px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                {index === 0 ? (
                  <Sparkles size={16} className="text-brand" />
                ) : index === items.length - 1 ? (
                  <ShieldCheck size={16} className="text-brand" />
                ) : (
                  <BrainCircuit size={16} className="text-brand" />
                )}
                {node.title}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{node.body}</p>
              {index < items.length - 1 ? (
                <ArrowRight
                  size={16}
                  className="absolute -right-2 top-6 hidden rounded-full border border-line bg-white p-0.5 text-muted lg:block"
                />
              ) : null}
            </div>
          )
        )}
      </div>
    </section>
  );
}
