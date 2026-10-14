"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { characters } from "@/domain/characters";
import type { CharacterId } from "@/domain/letterTypes";

type CharacterSelectorProps = {
  selectedCharacterId: CharacterId;
  onSelect: (characterId: CharacterId) => void;
};

export function CharacterSelector({ selectedCharacterId, onSelect }: CharacterSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {characters.map((character) => {
        const selected = character.id === selectedCharacterId;
        return (
          <button
            key={character.id}
            className={`relative border-2 p-3 text-left transition active:translate-y-1 ${
              selected
                ? "border-amber-200 bg-amber-200 text-stone-950"
                : "border-stone-500 bg-stone-900 text-amber-50 hover:border-amber-200"
            }`}
            onClick={() => onSelect(character.id)}
            type="button"
          >
            {selected ? <CheckCircle className="absolute right-2 top-2" size={20} weight="fill" /> : null}
            <h3 className="pr-6 font-mono text-sm font-bold">{character.name}</h3>
            <p className="mt-1 text-xs leading-5 opacity-80">{character.role}</p>
            <p className="mt-3 text-sm leading-6">{character.description}</p>
          </button>
        );
      })}
    </div>
  );
}
