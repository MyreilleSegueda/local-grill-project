
import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/services/categoryService';
import { errorResponse, successResponse } from '@/lib/auth/request';

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(successResponse({ categories }));
  } catch (error) {
    return NextResponse.json(errorResponse('Erreur lors de la récupération des catégories'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const category = await createCategory(body);
    return NextResponse.json(successResponse({ category }));
  } catch (error) {
    return NextResponse.json(errorResponse('Erreur lors de la création de la catégorie'), { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const category = await updateCategory(body.id, body);
    return NextResponse.json(successResponse({ category }));
  } catch (error) {
    return NextResponse.json(errorResponse('Erreur lors de la modification de la catégorie'), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    await deleteCategory(body.id);
    return NextResponse.json(successResponse({ success: true }));
  } catch (error) {
    return NextResponse.json(errorResponse('Erreur lors de la suppression de la catégorie'), { status: 500 });
  }
}
