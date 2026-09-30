export type SearchCategory = 'people' | 'posts' | 'companies' | 'jobs';
export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  summary: string;
}
export interface SearchProvider {
  search(
    query: string,
    categories: readonly SearchCategory[],
    cursor?: string,
  ): Promise<{ results: SearchResult[]; nextCursor: string | null }>;
}
