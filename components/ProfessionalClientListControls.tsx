import { ArrowUpDown, ChevronDown, ListFilter, Search } from "lucide-react";
import {
  PROFESSIONAL_CLIENT_FILTER_OPTIONS,
  PROFESSIONAL_CLIENT_SORT_OPTIONS,
  type ProfessionalClientFilter,
  type ProfessionalClientSort,
  type ProfessionalClientView,
} from "@/lib/professional-client-list";

type ProfessionalClientListControlsProps = {
  view: ProfessionalClientView;
  onViewChange: (view: ProfessionalClientView) => void;
  activeCount: number;
  archivedCount: number;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sort: ProfessionalClientSort;
  onSortChange: (value: ProfessionalClientSort) => void;
  filter: ProfessionalClientFilter;
  onFilterChange: (value: ProfessionalClientFilter) => void;
};

export default function ProfessionalClientListControls({
  view,
  onViewChange,
  activeCount,
  archivedCount,
  searchQuery,
  onSearchQueryChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
}: ProfessionalClientListControlsProps) {
  return (
    <div className="mt-8 space-y-4">
      <div
        role="tablist"
        aria-label="Client list view"
        className="flex w-fit items-center gap-1 rounded-full border border-lumina-border bg-lumina-surface p-1"
      >
        <ViewButton
          active={view === "active"}
          label="Active"
          count={activeCount}
          onClick={() => onViewChange("active")}
        />
        <ViewButton
          active={view === "archived"}
          label="Archived"
          count={archivedCount}
          onClick={() => onViewChange("archived")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(280px,1fr)_230px_250px]">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Search clients by name</span>
          <Search
            aria-hidden="true"
            size={18}
            strokeWidth={1.7}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lumina-text-muted"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search clients by name"
            className="min-h-12 w-full rounded-full border border-lumina-border bg-lumina-surface py-3 pl-11 pr-5 text-[15px] text-lumina-text outline-none transition placeholder:text-lumina-text-muted hover:border-lumina-text-muted/40 focus:border-lumina-text-muted/60"
          />
        </label>

        <SelectControl
          label="Sort clients"
          icon={<ArrowUpDown aria-hidden="true" size={16} strokeWidth={1.7} />}
          value={sort}
          onChange={(value) => onSortChange(value as ProfessionalClientSort)}
          options={PROFESSIONAL_CLIENT_SORT_OPTIONS}
        />

        <SelectControl
          label="Filter clients"
          icon={<ListFilter aria-hidden="true" size={16} strokeWidth={1.7} />}
          value={filter}
          onChange={(value) => onFilterChange(value as ProfessionalClientFilter)}
          options={PROFESSIONAL_CLIENT_FILTER_OPTIONS}
        />
      </div>
    </div>
  );
}

function ViewButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-10 rounded-full px-4 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text-muted ${
        active
          ? "bg-lumina-black text-white"
          : "text-lumina-text-muted hover:bg-lumina-surface-soft hover:text-lumina-text"
      }`}
    >
      {label} <span className={active ? "text-white/70" : "text-lumina-text-muted"}>{count}</span>
    </button>
  );
}

function SelectControl({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lumina-text-muted">
        {icon}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full appearance-none rounded-full border border-lumina-border bg-lumina-surface py-3 pl-11 pr-10 text-[14px] font-medium text-lumina-text outline-none transition hover:border-lumina-text-muted/40 focus:border-lumina-text-muted/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={16}
        strokeWidth={1.7}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lumina-text-muted"
      />
    </label>
  );
}
