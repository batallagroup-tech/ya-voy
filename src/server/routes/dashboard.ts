import { Router, Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

const router = Router();
const sql = neon(process.env.DATABASE_URL!);

async function getRestaurantId(userId: string) {
  const rows = await sql`SELECT id FROM restaurants WHERE clerk_user_id = ${userId} LIMIT 1`;
  return (rows[0]?.id as string) ?? null;
}

// GET /api/dashboard/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    if (!rid) return res.status(404).json({ error: 'Restaurante no encontrado' });

    const [hoy] = await sql`
      SELECT COUNT(*)::int AS orders, COALESCE(SUM(total),0)::numeric AS revenue
      FROM orders WHERE restaurant_id = ${rid} AND DATE(created_at) = CURRENT_DATE`;
    const [mes] = await sql`
      SELECT COUNT(*)::int AS orders, COALESCE(SUM(total),0)::numeric AS revenue
      FROM orders WHERE restaurant_id = ${rid}
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`;
    const [{ count: pendientes }] = await sql`
      SELECT COUNT(*)::int AS count FROM orders
      WHERE restaurant_id = ${rid} AND status = 'pending'`;

    res.json({ hoy, mes, pendientes });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/dashboard/orders?status=pending&limit=20
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    if (!rid) return res.status(404).json({ error: 'Restaurante no encontrado' });

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const status = req.query.status as string | undefined;
    const orders = status
      ? await sql`SELECT * FROM orders WHERE restaurant_id=${rid} AND status=${status} ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`SELECT * FROM orders WHERE restaurant_id=${rid} ORDER BY created_at DESC LIMIT ${limit}`;
    res.json(orders);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/dashboard/orders/:id/status
router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const { status } = req.body;
    const validos = ['pending','confirmed','preparing','ready','delivered','cancelled'];
    if (!validos.includes(status)) return res.status(400).json({ error: 'Estado invalido' });
    const rid = await getRestaurantId(userId);
    const [upd] = await sql`
      UPDATE orders SET status=${status}, updated_at=NOW()
      WHERE id=${req.params.id} AND restaurant_id=${rid} RETURNING *`;
    if (!upd) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(upd);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
