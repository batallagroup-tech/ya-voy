import { Router, Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

const router = Router();
const sql = neon(process.env.DATABASE_URL!);

async function getRestaurantId(userId: string) {
  const rows = await sql`SELECT id FROM restaurants WHERE clerk_user_id = ${userId} LIMIT 1`;
  return (rows[0]?.id as string) ?? null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    if (!rid) return res.status(404).json({ error: 'Restaurante no encontrado' });
    res.json(await sql`SELECT * FROM promotions WHERE restaurant_id=${rid} ORDER BY created_at DESC`);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    if (!rid) return res.status(404).json({ error: 'Restaurante no encontrado' });
    const { title, description, discount_type, discount_value, active = true, expires_at } = req.body;
    const [p] = await sql`
      INSERT INTO promotions (restaurant_id, title, description, discount_type, discount_value, active, expires_at)
      VALUES (${rid}, ${title}, ${description}, ${discount_type}, ${discount_value}, ${active}, ${expires_at})
      RETURNING *`;
    res.status(201).json(p);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    const [p] = await sql`
      UPDATE promotions SET active = NOT active, updated_at=NOW()
      WHERE id=${req.params.id} AND restaurant_id=${rid} RETURNING *`;
    if (!p) return res.status(404).json({ error: 'No encontrada' });
    res.json(p);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const rid = await getRestaurantId(userId);
    await sql`DELETE FROM promotions WHERE id=${req.params.id} AND restaurant_id=${rid}`;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
