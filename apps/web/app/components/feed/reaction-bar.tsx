'use client';

import * as Popover from '@radix-ui/react-popover';
import {
  ChevronDown,
  Heart,
  Lightbulb,
  ShieldCheck,
  SmilePlus,
  Sparkles,
  ThumbsUp,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ReactionType } from '../../modules/posts/service';

type ReactionOption = {
  type: ReactionType;
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  tone: string;
};

const defaultReaction: ReactionOption = {
  type: 'LIKE',
  label: 'Like',
  Icon: ThumbsUp,
  tone: 'blue',
};

const primaryReactions: readonly ReactionOption[] = [
  defaultReaction,
  { type: 'LOVE', label: 'Appreciate', Icon: Heart, tone: 'rose' },
  { type: 'JOY', label: 'Joy', Icon: SmilePlus, tone: 'amber' },
  { type: 'SURPRISED', label: 'Surprised', Icon: Sparkles, tone: 'violet' },
];

const signalReactions: readonly ReactionOption[] = [
  { type: 'UPVOTE', label: 'Upvote', Icon: ThumbsUp, tone: 'blue' },
  { type: 'VERIFY', label: 'Verify', Icon: ShieldCheck, tone: 'emerald' },
  { type: 'INSIGHTFUL', label: 'Insightful', Icon: Lightbulb, tone: 'amber' },
  { type: 'BENCHMARK', label: 'Benchmark', Icon: Sparkles, tone: 'violet' },
];

function ReactionButton({
  option,
  active,
  count,
  onReact,
}: {
  option: ReactionOption;
  active: boolean;
  count?: number;
  onReact: (reaction: ReactionType) => void;
}) {
  const { Icon } = option;
  return (
    <button
      aria-label={`${option.label}${count === undefined ? '' : `, ${count}`}`}
      className={`reaction-button reaction-button--${option.tone}${active ? ' is-active' : ''}`}
      onClick={() => onReact(option.type)}
      type="button"
    >
      <Icon aria-hidden="true" size={15} strokeWidth={2} />
      <span>{option.label}</span>
      {count === undefined || count === 0 ? null : <small>{count}</small>}
    </button>
  );
}

export function ReactionBar({
  counts,
  value,
  onReact,
}: {
  counts: Record<ReactionType, number>;
  value: ReactionType | null;
  onReact: (reaction: ReactionType) => void;
}) {
  const selected =
    primaryReactions.find((item) => item.type === value) ??
    signalReactions.find((item) => item.type === value);
  const primary = selected ?? defaultReaction;
  return (
    <div className="reaction-bar" aria-label="Post reactions">
      <ReactionButton
        active={value === primary.type}
        count={counts[primary.type]}
        onReact={onReact}
        option={primary}
      />
      <Popover.Root>
        <Popover.Trigger asChild>
          <button aria-label="Choose a reaction" className="reaction-more" type="button">
            <ChevronDown aria-hidden="true" size={15} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" className="reaction-picker" sideOffset={8}>
            <div className="reaction-picker__section">
              <p>React</p>
              <div>
                {primaryReactions.map((option) => (
                  <ReactionButton
                    active={value === option.type}
                    key={option.type}
                    onReact={onReact}
                    option={option}
                  />
                ))}
              </div>
            </div>
            <div className="reaction-picker__section">
              <p>Professional signal</p>
              <div>
                {signalReactions.map((option) => (
                  <ReactionButton
                    active={value === option.type}
                    key={option.type}
                    onReact={onReact}
                    option={option}
                  />
                ))}
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
