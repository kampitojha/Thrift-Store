'use client';

import { Input } from './input';
import { Select } from './select';
import { Button } from './button';
import { Search, X } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'search' | 'select' | 'date-range';
  options?: FilterOption[];
  placeholder?: string;
}

export interface FilterValues {
  [key: string]: string;
}

interface DataFiltersProps {
  config: FilterConfig[];
  values: FilterValues;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

export function DataFilters({ config, values, onChange, onClear }: DataFiltersProps) {
  const hasAnyFilter = Object.values(values).some((v) => v !== '');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {config.map((filter) => {
        if (filter.type === 'search') {
          return (
            <div key={filter.key} className="relative min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="h-10 rounded-xl border-ink-200 pl-9 pr-4 text-sm"
              />
            </div>
          );
        }

        if (filter.type === 'select') {
          return (
            <Select
              key={filter.key}
              placeholder={filter.placeholder || `All ${filter.label}`}
              options={filter.options || []}
              value={values[filter.key] || ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="h-10 min-w-[140px] rounded-xl border-ink-200 text-sm"
            />
          );
        }

        if (filter.type === 'date-range') {
          return (
            <div key={filter.key} className="flex items-center gap-1">
              <input
                type="date"
                value={values[`${filter.key}_from`] || ''}
                onChange={(e) => onChange(`${filter.key}_from`, e.target.value)}
                className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-ink-400 text-xs">&ndash;</span>
              <input
                type="date"
                value={values[`${filter.key}_to`] || ''}
                onChange={(e) => onChange(`${filter.key}_to`, e.target.value)}
                className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          );
        }

        return null;
      })}

      {hasAnyFilter && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-10 px-3 text-ink-500">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
