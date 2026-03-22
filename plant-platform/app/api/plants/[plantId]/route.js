import { deletePlant, getPlantDetail, updatePlant } from "@/lib/plants";
import { empty, error, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return empty();
}

export async function GET(_request, { params }) {
  try {
    const resolvedParams = await params;
    const plant = await getPlantDetail(resolvedParams.plantId);

    if (!plant) {
      return error("Plant not found", 404);
    }

    return json({ plant });
  } catch (requestError) {
    return error(requestError.message, 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const resolvedParams = await params;
    const payload = await request.json();
    const plant = await updatePlant(resolvedParams.plantId, payload);

    if (!plant) {
      return error("Plant not found", 404);
    }

    return json({ plant });
  } catch (requestError) {
    return error(requestError.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const resolvedParams = await params;
    const deleted = await deletePlant(resolvedParams.plantId);

    if (!deleted) {
      return error("Plant not found", 404);
    }

    return empty();
  } catch (requestError) {
    return error(requestError.message, 500);
  }
}
