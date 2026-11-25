import type { APIRoute } from "astro";
import { publicDoctors, cleanAuthorName } from "../../../lib/doctors";

export function getStaticPaths() {
  const doctors = publicDoctors().filter((d) => (d.reviews?.length || 0) > 10);
  return doctors.map((doctor) => ({
    params: { slug: doctor.slug },
    props: { reviews: doctor.reviews },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const sanitized = (props.reviews || []).map((r: any) => ({
    ...r,
    author: cleanAuthorName(r.author),
  }));
  return new Response(JSON.stringify(sanitized), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
};
