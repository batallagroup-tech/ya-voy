import { Product } from './types';

export const FEES = {
  SHIPPING: 35.00,
  SERVICE: 8.50,
  CANCELLATION: 25.00
};

export const storeSubCategories: Record<string, string[]> = {
  'Conveniencia': ['Todos', 'Bebidas', 'Snacks', 'Comida Rápida'],
  'Supermercado': ['Todos', 'Lácteos', 'Despensa', 'Panadería', 'Frutas y Verduras'],
  'Farmacia': ['Todos', 'Medicamentos', 'Cuidado Personal'],
  'Mexicana': ['Todos', 'Antojitos', 'Tacos', 'Bebidas', 'Postres'],
  'Sushi': ['Todos', 'Rollos', 'Nigiris', 'Entradas', 'Ramen'],
  'Hamburguesas': ['Todos', 'Clásicas', 'Especiales', 'Snacks', 'Bebidas'],
  'Pizza': ['Todos', 'Clásicas', 'Especiales', 'Complementos', 'Bebidas'],
  'Ensaladas': ['Todos', 'Ensaladas', 'Bowls', 'Jugos', 'Snacks'],
  'Postres': ['Todos', 'Pasteles', 'Helados', 'Galletas', 'Café'],
  'Bebidas': ['Todos', 'Refrescos', 'Jugos', 'Cervezas', 'Vinos']
};

export const subCategories = {
  comida: ['Todos', 'Mexicana', 'Sushi', 'Hamburguesas', 'Pizza', 'Ensaladas', 'Postres', 'Bebidas'],
  tienda: ['Todos', 'Supermercado', 'Conveniencia', 'Departamentales', 'Farmacia'],
  paquete: []
};
