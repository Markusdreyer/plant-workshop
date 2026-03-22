import { createPlant, listPlants } from "@/lib/plants";
import { empty, error, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return empty();
}

export async function GET() {
  try {
    const plants = await listPlants();
    return json({ plants });
  } catch (requestError) {
    return error(requestError.message, 500);
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const plant = await createPlant(payload.name, payload.id);

    return json(
      {
        plant
      },
      {
        status: 201
      }
    );
  } catch (requestError) {
    return error(requestError.message);
  }
}
