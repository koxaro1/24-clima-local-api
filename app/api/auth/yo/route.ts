import { requireUser } from '../../../../lib/auth';
import { errorResponse, json } from '../../../../lib/http';

export async function GET(req: Request): Promise<Response> {
  try {
    const u = await requireUser(req);
    return json({ usuario: { id: u.uid, email: u.email } });
  } catch (e) {
    return errorResponse(e);
  }
}
