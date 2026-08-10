"use client";

import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showButton?: boolean;
  onSearch?: () => void;
};
export default function SearchBar({
  value,
  onChange,
  placeholder = "Search artists, services...",
  showButton = false,
  onSearch,
}: SearchBarProps) {
  return (
  <div className="relative w-full">
      <form
  onSubmit={(event) => {
    event.preventDefault();
    onSearch?.();
  }}
  className="flex w-full items-center rounded-full border border-[#e7e3df] bg-white p-2 pl-6 shadow-sm transition focus-within:border-neutral-400 focus-within:shadow-md"
>
  <Search
    size={20}
    className="mr-4 text-neutral-400"
  />

  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full bg-transparent text-[16px] outline-none placeholder:text-neutral-400"
  />

  {showButton && (
  <button
  type="submit"
    className="shrink-0 rounded-full bg-black px-6 py-3 text-[14px] font-medium text-white transition hover:opacity-85"
  >
    Search
  </button>
)}
</form>
</div>
  );
}