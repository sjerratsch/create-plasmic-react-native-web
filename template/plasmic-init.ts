import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

export const PLASMIC = initPlasmicLoader({
    projects: [
        {
            id: "[projectId]", // ID of a project you are using
            token: "[projectApiToken]", // API token for that project
        },
    ],
    // Fetches the latest revisions, whether or not they were unpublished!
    // Disable for production to ensure you render only published changes.
    preview: true,
});
