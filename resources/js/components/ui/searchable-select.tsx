import { cn } from '@/lib/utils';
import { type SelectOption } from '@/types';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { type ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface SearchableSelectProps<TOption extends SelectOption> {
    id?: string;
    value: string;
    options: TOption[];
    onValueChange: (value: string) => void;
    placeholder: string;
    searchPlaceholder: string;
    emptyText: string;
    disabled?: boolean;
    className?: string;
    renderOption?: (option: TOption) => ReactNode;
}

export default function SearchableSelect<TOption extends SelectOption>({
    id,
    value,
    options,
    onValueChange,
    placeholder,
    searchPlaceholder,
    emptyText,
    disabled = false,
    className,
    renderOption,
}: SearchableSelectProps<TOption>) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = normalizeSearchText(query);

        if (normalizedQuery === '') {
            return options;
        }

        return options.filter((option) => {
            const searchableText = normalizeSearchText(`${option.label} ${option.value}`);

            return searchableText.includes(normalizedQuery);
        });
    }, [options, query]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    useEffect(() => {
        const closeOnOutsideClick = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', closeOnOutsideClick);

        return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
    }, []);

    const selectOption = (selectedValue: string) => {
        onValueChange(selectedValue);
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div ref={rootRef} className={cn('relative min-w-0', className)}>
            <button
                id={id}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={cn(
                    'border-input bg-card ring-offset-background focus:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm shadow-black/5 transition-colors hover:border-ring/45 focus:border-ring focus:ring-2 focus:ring-offset-0 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
                    selectedOption ? 'text-foreground' : 'text-muted-foreground',
                )}
                onClick={() => {
                    setQuery('');
                    setIsOpen((open) => !open);
                }}
            >
                <span className="truncate text-start">{selectedOption?.label ?? placeholder}</span>
                <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            </button>

            {isOpen ? (
                <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md">
                    <div className="border-sidebar-border/70 flex items-center gap-2 border-b px-3">
                        <Search className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setIsOpen(false);
                                }

                                if (event.key === 'Enter') {
                                    event.preventDefault();

                                    if (filteredOptions[0]) {
                                        selectOption(filteredOptions[0].value);
                                    }
                                }
                            }}
                            placeholder={searchPlaceholder}
                            className="placeholder:text-muted-foreground h-10 min-w-0 flex-1 bg-transparent text-sm outline-hidden"
                        />
                    </div>

                    <div className="max-h-72 overflow-y-auto p-1" role="listbox" aria-labelledby={id}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        className={cn(
                                            'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-start text-sm outline-hidden',
                                            isSelected && 'bg-accent/70 text-accent-foreground',
                                        )}
                                        onClick={() => selectOption(option.value)}
                                    >
                                        <span className="min-w-0 truncate">{renderOption ? renderOption(option) : option.label}</span>
                                        {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="text-muted-foreground px-2 py-6 text-center text-sm">{emptyText}</div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function normalizeSearchText(value: string) {
    return value.trim().toLowerCase();
}
