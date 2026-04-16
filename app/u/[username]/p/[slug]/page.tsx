import { redirect } from "next/navigation";

interface UserScopedPublicPageProps {
    params: Promise<{
        username: string;
        slug: string;
    }>;
}

export default async function UserScopedPublicPage({ params }: UserScopedPublicPageProps) {
    const resolved = await params;
    const username = encodeURIComponent(resolved.username || "");
    const slug = encodeURIComponent(resolved.slug || "");
    redirect(`/p/${slug}?u=${username}`);
}
