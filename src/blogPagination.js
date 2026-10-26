export const PAGE_SIZE = 20;
export const blogPagePath = (page) => page === 1 ? '/blog/' : `/blog/page/${page}/`;
export const sortPosts = (posts) => [...posts].sort((a, b) =>
  b.data.date.valueOf() - a.data.date.valueOf() || String(a.id).localeCompare(String(b.id)));
