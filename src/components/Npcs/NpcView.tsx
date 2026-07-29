import { useEffect, useMemo, useState } from 'react';
import { loadNpcProfiles, matchesQuery } from '../../utils/npcProfiles';
import type { NpcProfile } from '../../utils/npcProfiles';

interface Props {
  onOpenSource: (mdPath: string, anchor?: string) => void;
}

// Field labels in the order Reloaded presents them, split into the two groups
// the guide itself uses. Anything unexpected still renders, at the end.
const ROLEPLAY_FIELDS = ['Resonance', 'Emotions', 'Motivations', 'Inspirations', 'Inspiration'];
const CHARACTER_FIELDS = ['Persona', 'Morale', 'Relationships'];

function groupFields(npc: NpcProfile) {
  const pick = (labels: string[]) =>
    labels
      .map((l) => npc.fields.find((f) => f.label === l))
      .filter((f): f is NonNullable<typeof f> => !!f);

  const roleplay = pick(ROLEPLAY_FIELDS);
  const character = pick(CHARACTER_FIELDS);
  const known = new Set([...roleplay, ...character]);
  const other = npc.fields.filter((f) => !known.has(f));

  return { roleplay, character, other };
}

function FieldList({ fields }: { fields: { label: string; html: string }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {fields.map((f) => (
        <div key={f.label}>
          <p className="text-[11px] uppercase tracking-widest text-amber-600 font-sans mb-0.5">
            {f.label}
          </p>
          <p
            className="text-sm text-stone-300 font-sans leading-relaxed npc-field"
            dangerouslySetInnerHTML={{ __html: f.html }}
          />
        </div>
      ))}
    </div>
  );
}

function NpcCard({ npc, onOpenSource }: { npc: NpcProfile; onOpenSource: Props['onOpenSource'] }) {
  const { roleplay, character, other } = groupFields(npc);

  return (
    <div>
      <div className="flex items-start gap-4 mb-5">
        {npc.art && (
          <img
            src={npc.art}
            alt={npc.name}
            className="w-28 h-28 rounded-xl object-cover border border-amber-900/40 flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-serif font-bold text-amber-400 text-glow leading-tight">
            {npc.name}
          </h1>
          <button
            onClick={() => onOpenSource(npc.mdPath, npc.anchor ?? undefined)}
            className="text-xs font-sans text-stone-500 hover:text-amber-400 transition-colors mt-1 text-left"
            title="Open this profile's page in the campaign guide"
          >
            📖 {npc.sourceLabel} ↗
          </button>
          {npc.alsoOn.length > 0 && (
            <p className="text-[11px] text-stone-600 font-sans mt-0.5">
              also appears in: {npc.alsoOn.join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roleplay.length > 0 && (
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5">
            <h2 className="text-xs uppercase tracking-widest text-stone-500 font-sans mb-3">
              🎭 Roleplaying
            </h2>
            <FieldList fields={roleplay} />
          </div>
        )}
        {(character.length > 0 || other.length > 0) && (
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl p-5">
            <h2 className="text-xs uppercase tracking-widest text-stone-500 font-sans mb-3">
              📇 Character
            </h2>
            <FieldList fields={[...character, ...other]} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function NpcView({ onOpenSource }: Props) {
  const [npcs, setNpcs] = useState<NpcProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadNpcProfiles()
      .then((list) => { if (!cancelled) setNpcs(list); })
      .catch((e) => { if (!cancelled) setError(String(e)); });
    return () => { cancelled = true; };
  }, []);

  const results = useMemo(
    () => (npcs ?? []).filter((n) => matchesQuery(n, query)),
    [npcs, query]
  );

  const selected =
    results.find((n) => n.id === selectedId) ?? results[0] ?? null;

  if (error) {
    return (
      <div className="text-center py-16 text-stone-500 font-sans text-sm">
        <p className="text-3xl mb-2">🎭</p>
        <p>Couldn't read the NPC profiles.</p>
        <p className="text-stone-600 text-xs mt-1">{error}</p>
      </div>
    );
  }

  if (!npcs) {
    return (
      <p className="text-stone-600 font-sans text-sm italic py-16 text-center">
        Reading the dossiers…
      </p>
    );
  }

  return (
    <div className="flex h-full max-w-7xl mx-auto">
      <aside className="w-72 flex-shrink-0 border-r border-stone-800 overflow-y-auto p-4">
        <h1 className="text-lg font-serif font-bold text-amber-400 text-glow mb-1">NPCs</h1>
        <p className="text-stone-600 text-xs font-sans mb-3">
          {npcs.length} profiles from the guide
        </p>

        <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 mb-3 focus-within:border-amber-700/60 transition-colors">
          <span className="text-stone-500 text-xs">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, motivation, mood…"
            className="flex-1 bg-transparent text-parchment placeholder-stone-600 text-sm font-sans focus:outline-none min-w-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-stone-600 hover:text-stone-400 text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-col">
          {results.map((n) => {
            const isSelected = selected?.id === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                  isSelected ? 'bg-amber-900/30' : 'hover:bg-stone-800/70'
                }`}
              >
                {n.art ? (
                  <img
                    src={n.art}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-stone-700"
                    loading="lazy"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center text-xs flex-shrink-0">
                    🎭
                  </span>
                )}
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-serif truncate ${
                      isSelected ? 'text-amber-300' : 'text-stone-300'
                    }`}
                  >
                    {n.name}
                  </span>
                  <span className="block text-[11px] text-stone-600 font-sans truncate">
                    {n.sourceLabel}
                  </span>
                </span>
              </button>
            );
          })}
          {results.length === 0 && (
            <p className="text-stone-600 text-sm font-sans italic py-3">
              No profile matching “{query}”
            </p>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        {selected ? (
          <NpcCard key={selected.id} npc={selected} onOpenSource={onOpenSource} />
        ) : (
          <div className="text-center py-16 text-stone-600">
            <p className="text-4xl mb-2">🎭</p>
            <p className="font-serif italic">Pick an NPC</p>
          </div>
        )}
      </div>
    </div>
  );
}
