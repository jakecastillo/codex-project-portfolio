import { useEffect, useMemo, useState } from 'react';
import type { Application, ApplicationLink } from '../types/application';

interface UseApplicationCatalogResult {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
}

type RawApplication = Partial<Application> & {
  id?: string;
  title?: string;
  links?: (ApplicationLink | string | null | undefined)[];
};

const BASE_URL = import.meta.env.BASE_URL ?? '/';

function resolveBaseUrl(): URL {
  if (typeof window === 'undefined') {
    return new URL(BASE_URL, 'http://localhost/');
  }

  return new URL(BASE_URL, window.location.href);
}

function toAbsoluteHref(href: string): string {
  try {
    return new URL(href, resolveBaseUrl()).toString();
  } catch (error) {
    console.warn('Unable to resolve href', href, error);
    return href;
  }
}

function resolveLinks(candidateLinks: RawApplication['links'], fallbackHref: string): ApplicationLink[] {
  if (!candidateLinks?.length) {
    return [
      {
        label: 'Open project',
        href: toAbsoluteHref(fallbackHref)
      }
    ];
  }

  return candidateLinks
    .map((link) => {
      if (!link) return null;
      if (typeof link === 'string') {
        return {
          label: 'Open project',
          href: toAbsoluteHref(link)
        } satisfies ApplicationLink;
      }

      const href = link.href ?? fallbackHref;
      const target = link.target ?? (href.startsWith('http') ? '_blank' : undefined);

      return {
        label: link.label ?? 'Open project',
        href: toAbsoluteHref(href),
        ...(target ? { target } : {}),
        ...(link.rel ? { rel: link.rel } : {})
      } satisfies ApplicationLink;
    })
    .filter((link): link is ApplicationLink => Boolean(link));
}

function normalizeApplication(raw: RawApplication): Application | null {
  if (!raw.id) return null;
  const fallbackHref = `applications/${raw.id}/${raw.id}.html`;

  return {
    id: raw.id,
    order: raw.order,
    tag: raw.tag ?? '',
    title: raw.title ?? raw.id,
    summary: raw.summary ?? '',
    description: raw.description ?? '',
    highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
    tech: Array.isArray(raw.tech) ? raw.tech : [],
    links: resolveLinks(raw.links, fallbackHref),
    paneClass: raw.paneClass ?? ''
  } satisfies Application;
}

function coerceCatalog(payload: unknown): Application[] {
  const records: RawApplication[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { applications?: RawApplication[] })?.applications)
      ? ((payload as { applications?: RawApplication[] }).applications as RawApplication[])
      : [];

  return records
    .map(normalizeApplication)
    .filter((app): app is Application => Boolean(app?.id))
    .sort((a, b) => {
      const orderDelta = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
      if (orderDelta !== 0) return orderDelta;
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    });
}

function readWindowFallback(): Application[] {
  if (typeof window === 'undefined') return [];
  const fallback = (window as typeof window & { __APPLICATION_CATALOG__?: unknown }).__APPLICATION_CATALOG__;
  return coerceCatalog(fallback ?? []);
}

export function useApplicationCatalog(): UseApplicationCatalogResult {
  const [applications, setApplications] = useState<Application[]>(() => readWindowFallback());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const baseUrl = resolveBaseUrl();
    const catalogUrl = new URL('applications/catalog.json', baseUrl).toString();

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch(catalogUrl, {
          cache: 'no-store',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!isMounted) return;

        const normalized = coerceCatalog(payload);
        setApplications(normalized);
        setError(null);
      } catch (err) {
        if (!isMounted || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }

        console.error('Failed to load application catalog', err);
        setError(err instanceof Error ? err.message : 'Unable to load portfolio projects.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const memoized = useMemo(() => applications, [applications]);

  return {
    applications: memoized,
    isLoading,
    error
  };
}
