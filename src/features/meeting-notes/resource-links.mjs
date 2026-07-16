export function resourcesToRelatedLinks(resources = []) {
  return resources
    .filter((resource) => resource?.url)
    .map((resource) => ({
      href: resource.url,
      text: resource.title,
      ...(resource.linkText ? { linkText: resource.linkText } : {}),
      type: resource.type,
    }));
}

export function relatedLinksToResources(relatedLinks = []) {
  return relatedLinks.map((link) => ({
    title: link.text || link.href,
    linkText: link.linkText,
    url: link.href,
    type: link.type,
  }));
}

export function normalizeMeetingResources(meetingData = {}) {
  return meetingData.resources?.length
    ? meetingData.resources
    : relatedLinksToResources(meetingData.relatedLinks ?? []);
}
