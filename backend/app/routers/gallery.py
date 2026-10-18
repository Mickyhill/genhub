from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.core.deps import get_current_admin
from app.models import GalleryItem
from app.schemas.gallery import GalleryItemOut, GalleryItemUpdate

ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 3 * 1024 * 1024  # 3 MB per picture

# Anyone may look at the pictures (they are campus photos, nothing private).
public_router = APIRouter(prefix="/browse/gallery", tags=["gallery"])
admin_router = APIRouter(prefix="/admin/gallery", tags=["gallery-admin"], dependencies=[Depends(get_current_admin)])


@public_router.get("", response_model=list[GalleryItemOut])
def list_items(db: Session = Depends(get_db)):
    return db.query(GalleryItem).order_by(GalleryItem.created_at.desc(), GalleryItem.id.desc()).all()


@public_router.get("/{item_id}/image")
def get_image(item_id: int, db: Session = Depends(get_db)):
    item = db.get(GalleryItem, item_id)
    if not item:
        raise HTTPException(404, "Picture not found")
    return Response(
        content=item.image_data,
        media_type=item.content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@admin_router.post("", response_model=GalleryItemOut)
async def add_item(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "Use a JPG, PNG or WEBP picture")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "Picture is too large. Keep it under 3 MB")
    if not title.strip():
        raise HTTPException(400, "Add a title")
    item = GalleryItem(
        title=title.strip()[:120], description=description.strip()[:1000] or None,
        content_type=file.content_type, image_data=data,
    )
    db.add(item); db.commit(); db.refresh(item)
    return item


@admin_router.patch("/{item_id}", response_model=GalleryItemOut)
def update_item(item_id: int, data: GalleryItemUpdate, db: Session = Depends(get_db)):
    item = db.get(GalleryItem, item_id)
    if not item:
        raise HTTPException(404, "Picture not found")
    item.title = data.title.strip()
    item.description = (data.description or "").strip() or None
    db.commit(); db.refresh(item)
    return item


@admin_router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(GalleryItem, item_id)
    if not item:
        raise HTTPException(404, "Picture not found")
    db.delete(item); db.commit()


# ── First-run pictures so the folder never starts empty ──────────────
SEED = [
    ("campus-life.jpg", "Life on campus", "Students gather outside one of our new campus buildings."),
    ("innovation.jpg", "Innovation at our core", "The FUTIA crest set inside a gear: technology that drives transformation."),
    ("campus-blocks.jpg", "Our campus blocks", "Red brick blocks among the trees of the Ikot Abasi campus."),
]


def seed_gallery():
    db = SessionLocal()
    try:
        if db.query(GalleryItem).count() > 0:
            return
        folder = Path(__file__).resolve().parent.parent / "seed"
        for filename, title, desc in reversed(SEED):  # newest-first listing then shows the banner first
            f = folder / filename
            if f.exists():
                db.add(GalleryItem(title=title, description=desc, content_type="image/jpeg", image_data=f.read_bytes()))
        db.commit()
    finally:
        db.close()
