// Capture one instant per build so routes and indexes agree at the publication boundary.
const publicationTime = new Date(process.env.BLOG_BUILD_AT || Date.now());
if (Number.isNaN(publicationTime.valueOf())) throw new Error('Invalid BLOG_BUILD_AT');
export function isPublished({ data }) {
  return data.status === 'published'
    && (!data.scheduledAt || data.scheduledAt.valueOf() <= publicationTime.valueOf());
}
