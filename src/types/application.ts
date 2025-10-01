export interface ApplicationLink {
  label: string;
  href: string;
  target?: string;
  rel?: string;
}

export interface Application {
  id: string;
  order?: number;
  tag: string;
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  tech: string[];
  links: ApplicationLink[];
  paneClass?: string;
}
