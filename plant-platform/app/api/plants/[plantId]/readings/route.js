import { appendPlantReading } from "@/lib/plants";
import { empty, error, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return empty();
}

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const payload = await request.json();
    const result = await appendPlantReading(resolvedParams.plantId, payload);

    if (!result) {
      return error("Plant not found", 404);
    }

    return json(result, {
      status: 201
    });
  } catch (requestError) {
    return error(requestError.message);
  }
}
