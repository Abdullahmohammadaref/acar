import io

from django.core.files.base import ContentFile
from ninja.files import UploadedFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_VEHICLE_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VEHICLE_IMAGE_DIMENSION = 2400
ALLOWED_VEHICLE_IMAGE_FORMATS_TEXT = "JPG, JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF"


def process_vehicle_image(uploaded_image: UploadedFile, *, filename_stem: str) -> ContentFile:
    """
    Validate and normalize an uploaded vehicle image.

    The image is verified with Pillow, rotated according to EXIF, resized to a
    reasonable maximum, stripped of metadata by re-saving, and stored as either
    JPEG or PNG depending on alpha support.
    """
    if uploaded_image.size <= 0:
        raise ValueError("The uploaded image is empty.")

    if uploaded_image.size > MAX_VEHICLE_IMAGE_BYTES:
        raise ValueError("Image is too large. Maximum size is 10MB.")

    raw_bytes = uploaded_image.read()
    if not raw_bytes:
        raise ValueError("The uploaded image is empty.")

    try:
        with Image.open(io.BytesIO(raw_bytes)) as source_image:
            source_image.load()
            normalized_image = ImageOps.exif_transpose(source_image)
            processed_image = normalized_image.copy()
    except UnidentifiedImageError as exc:
        raise ValueError(
            f"Invalid image file. Allowed formats: {ALLOWED_VEHICLE_IMAGE_FORMATS_TEXT}."
        ) from exc
    except OSError as exc:
        raise ValueError(
            f"This image format is not supported. Allowed formats: {ALLOWED_VEHICLE_IMAGE_FORMATS_TEXT}."
        ) from exc

    if processed_image.width <= 0 or processed_image.height <= 0:
        raise ValueError("The uploaded image could not be processed.")

    processed_image.thumbnail(
        (MAX_VEHICLE_IMAGE_DIMENSION, MAX_VEHICLE_IMAGE_DIMENSION),
        Image.Resampling.LANCZOS,
    )

    has_alpha = processed_image.mode in {"RGBA", "LA"} or (
        processed_image.mode == "P" and "transparency" in processed_image.info
    )

    output = io.BytesIO()
    if has_alpha:
        final_image = processed_image.convert("RGBA")
        final_image.save(output, format="PNG", optimize=True)
        extension = "png"
    else:
        final_image = processed_image.convert("RGB")
        final_image.save(
            output,
            format="JPEG",
            quality=88,
            optimize=True,
            progressive=True,
        )
        extension = "jpg"

    output.seek(0)
    return ContentFile(output.getvalue(), name=f"{filename_stem}.{extension}")
