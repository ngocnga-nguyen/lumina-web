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
  className="flex w-full items-center rounded-full border border-[#e7e3df] bg-white p-1.5 pl-4 shadow-sm transition focus-within:border-neutral-400 focus-within:shadow-md sm:p-2 sm:pl-6"
>
  <Search
    size={18}
    className="mr-2.5 shrink-0 text-neutral-400 sm:mr-4"
  />

  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="min-w-0 w-full bg-transparent text-[14px] outline-none placeholder:text-neutral-400 sm:text-[16px]"
  />

  {showButton && (
  <button
  type="submit"
    className="shrink-0 rounded-full bg-black px-4 py-2.5 text-[13px] font-medium text-white transition hover:opacity-85 sm:px-6 sm:py-3 sm:text-[14px]"
  >
    Search
  </button>
)}
</form>
</div>
  );
}
