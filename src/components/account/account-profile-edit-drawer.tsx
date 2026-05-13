"use client";

import { useMutation } from "convex/react";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { PublicUser } from "@convex/lib/publicUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useUserAvatarUrl } from "@/hooks/use-user-avatar-url";
import { userInitials } from "@/lib/user-display";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type AccountProfileEditDrawerProps = {
  user: PublicUser;
  sessionToken: string;
  /** Controlled open state (use with `onOpenChange`, e.g. header tap to open). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When false, render only the drawer surface (open via controlled `open`). */
  showTrigger?: boolean;
};

export function AccountProfileEditDrawer({
  user,
  sessionToken,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: AccountProfileEditDrawerProps) {
  const avatarUrl = useUserAvatarUrl(user);
  const updateUser = useMutation(api.users.update);
  const generateProfileUpload = useMutation(api.files.generateProfileUploadUrl);

  const [internalOpen, setInternalOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [removeStoredPhoto, setRemoveStoredPhoto] = useState(false);
  const [removeLegacyPhoto, setRemoveLegacyPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setNameDraft(user.name?.trim() ?? "");
        setNewPhotoFile(null);
        setNewPhotoPreview((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return null;
        });
        setRemoveStoredPhoto(false);
        setRemoveLegacyPhoto(false);
      }
      if (isControlled) {
        onOpenChange?.(next);
      } else {
        setInternalOpen(next);
      }
    },
    [isControlled, onOpenChange, user.name],
  );

  const hasStoredAvatar = Boolean(user.profileImageId);
  const hasLegacyAvatar = Boolean(
    user.image?.trim() && /^https?:\/\//i.test(user.image.trim()),
  );

  function revokePreview() {
    setNewPhotoPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be 2MB or smaller.");
      return;
    }
    setNewPhotoFile(file);
    setRemoveStoredPhoto(false);
    setRemoveLegacyPhoto(false);
    revokePreview();
    setNewPhotoPreview(URL.createObjectURL(file));
  }

  function clearPendingPhoto() {
    setNewPhotoFile(null);
    revokePreview();
  }

  async function onSave() {
    setSaving(true);
    try {
      let profileImageId: Id<"_storage"> | null | undefined;
      if (newPhotoFile) {
        const postUrl = await generateProfileUpload({ sessionToken });
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": newPhotoFile.type || "application/octet-stream" },
          body: newPhotoFile,
        });
        if (!res.ok) {
          throw new Error("Could not upload profile photo.");
        }
        const data = (await res.json()) as { storageId: Id<"_storage"> };
        profileImageId = data.storageId;
      } else if (removeStoredPhoto && user.profileImageId) {
        profileImageId = null;
      }

      const trimmed = nameDraft.trim();
      const clearingLegacy =
        removeLegacyPhoto || (removeStoredPhoto && Boolean(user.image?.trim()));

      await updateUser({
        sessionToken,
        userId: user._id,
        name: trimmed.length > 0 ? trimmed : "",
        ...(profileImageId !== undefined ? { profileImageId } : {}),
        ...(clearingLegacy && !newPhotoFile ? { image: null } : {}),
      });
      toast.success("Profile updated");
      handleOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const fallback = userInitials(user.name, user.email);
  const previewSrc =
    newPhotoPreview ?? (!(removeStoredPhoto || removeLegacyPhoto) ? avatarUrl : null);

  const removingPhoto = removeStoredPhoto || removeLegacyPhoto;

  function markRemovePhoto() {
    if (hasStoredAvatar) {
      setRemoveStoredPhoto(true);
      setRemoveLegacyPhoto(false);
    } else if (hasLegacyAvatar) {
      setRemoveLegacyPhoto(true);
      setRemoveStoredPhoto(false);
    }
  }

  function undoRemovePhoto() {
    setRemoveStoredPhoto(false);
    setRemoveLegacyPhoto(false);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      {showTrigger ? (
        <DrawerTrigger asChild>
          <Button type="button" variant="outline" className="mt-4 gap-2">
            <Pencil className="size-4" aria-hidden />
            Edit profile
          </Button>
        </DrawerTrigger>
      ) : null}
      <DrawerContent className="pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit profile</DrawerTitle>
          <DrawerDescription className="text-muted-foreground">
            Update your display name and profile photo. Your email cannot be changed here.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-5 px-4 pb-2">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="border-background size-24 border-4 shadow-md ring-2 ring-muted/50">
              {previewSrc ? (
                <AvatarImage src={previewSrc} alt="" className="object-cover" />
              ) : null}
              <AvatarFallback className="text-lg font-semibold">{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {newPhotoFile || hasStoredAvatar || hasLegacyAvatar ? "Change photo" : "Upload photo"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPhotoChange}
              />
              {newPhotoFile ? (
                <Button type="button" variant="ghost" size="sm" onClick={clearPendingPhoto}>
                  Cancel new photo
                </Button>
              ) : null}
              {(hasStoredAvatar || hasLegacyAvatar) && !newPhotoFile && !removingPhoto ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1"
                  onClick={() => {
                    markRemovePhoto();
                    clearPendingPhoto();
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove photo
                </Button>
              ) : removingPhoto && !newPhotoFile ? (
                <Button type="button" variant="ghost" size="sm" onClick={undoRemovePhoto}>
                  Undo remove
                </Button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="account-profile-name" className="text-sm font-medium">
              Display name
            </label>
            <Input
              id="account-profile-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              maxLength={120}
            />
          </div>
        </div>
        <DrawerFooter className="gap-2 pt-2">
          <Button type="button" className="w-full sm:w-auto" disabled={saving} onClick={() => void onSave()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <DrawerClose asChild>
            <Button type="button" variant="ghost" className="w-full sm:w-auto" disabled={saving}>
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
