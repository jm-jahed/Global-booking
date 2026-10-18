export interface PageContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly notice?: string;
  readonly primaryAction?: { readonly label: string; readonly href: string };
  readonly secondaryAction?: { readonly label: string; readonly href: string };
  readonly points?: readonly {
    readonly title: string;
    readonly description: string;
  }[];
}
