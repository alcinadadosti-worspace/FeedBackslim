'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { User, Mail, Briefcase, Building, Camera, Save, Slack } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth';
import { gestoresAPI, uploadAPI } from '@/lib/api';
import api from '@/lib/api';

async function compressImageToTarget(file: File, maxBytes: number): Promise<File> {
  const originalType = file.type || 'image/jpeg';
  const targetType = originalType === 'image/png' ? 'image/png' : 'image/webp';

  const bitmap = await createImageBitmap(file);
  const maxSize = 256;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const targetW = Math.max(1, Math.round(bitmap.width * scale));
  const targetH = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Falha ao processar imagem');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  const toBlob = (type: string, quality?: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) return reject(new Error('Falha ao processar imagem'));
          resolve(b);
        },
        type,
        quality
      );
    });

  if (targetType === 'image/png') {
    const blob = await toBlob('image/png');
    if (blob.size > maxBytes) {
      throw new Error('Imagem muito grande. Use uma foto menor ou em JPG/WebP.');
    }
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' });
  }

  let quality = 0.82;
  let blob = await toBlob('image/webp', quality);
  while (blob.size > maxBytes && quality > 0.35) {
    quality -= 0.12;
    blob = await toBlob('image/webp', quality);
  }

  if (blob.size > maxBytes) {
    const jpegBlob = await toBlob('image/jpeg', 0.72);
    if (jpegBlob.size > maxBytes) {
      throw new Error('Imagem muito grande. Tente uma foto menor.');
    }
    return new File([jpegBlob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
}

export default function PerfilPage() {
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(user?.nome || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // Campos de gestor
  const [cargo, setCargo] = useState(user?.gestor?.cargo || '');
  const [departamento, setDepartamento] = useState(user?.gestor?.departamento || '');
  const [bio, setBio] = useState(user?.gestor?.bio || '');
  const [slackUserId, setSlackUserId] = useState(user?.gestor?.slackUserId || '');
  const [foto, setFoto] = useState(user?.gestor?.foto || '');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isGestor = user?.role === 'GESTOR' || (user?.role === 'RH_ADMIN' && !!user?.gestor);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const optimized = await compressImageToTarget(file, 250 * 1024);
      const response = await uploadAPI.upload(optimized);
      const url = response.data.url;

      if (isGestor) {
        setFoto(url);
        if (user?.gestor?.id) {
          await gestoresAPI.update(user.gestor.id, { foto: url });
          updateUser({
            gestor: user?.gestor
              ? {
                  ...user.gestor,
                  foto: url
                }
              : undefined
          });
        } else {
          setAvatar(url);
          await api.put(`/users/${user?.id}`, { avatar: url });
          updateUser({ avatar: url });
        }
      } else {
        setAvatar(url);
        await api.put(`/users/${user?.id}`, { avatar: url });
        updateUser({ avatar: url });
      }

      toast.success('Foto enviada com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Atualizar usuário
      await api.put(`/users/${user?.id}`, { nome, avatar });

      // Se for gestor, atualizar perfil de gestor
      if (isGestor && user?.gestor?.id) {
        await gestoresAPI.update(user.gestor.id, {
          cargo,
          departamento,
          bio,
          slackUserId,
          foto,
        });
      }

      updateUser({
        nome,
        avatar,
        gestor: user?.gestor
          ? {
              ...user.gestor,
              cargo,
              departamento,
              bio,
              slackUserId,
              foto,
            }
          : undefined,
      });

      toast.success('Perfil atualizado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-neutral-100">Meu Perfil</h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-1">
            Gerencie suas informações pessoais
          </p>
        </div>

        <Card>
          <CardContent className="space-y-6">
            {/* Foto */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar
                  src={isGestor ? foto : avatar}
                  alt={nome}
                  size="xl"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-primary-500 border-3 border-neutral-900 flex items-center justify-center hover:bg-primary-600 transition-colors"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                Clique para alterar a foto
              </p>
            </div>

            {/* Role Badge */}
            <div className="text-center">
              <Badge variant={isGestor ? 'gold' : user?.role === 'RH_ADMIN' ? 'primary' : 'neutral'}>
                {user?.role?.replace('_', ' ')}
              </Badge>
            </div>

            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Básicas
              </h3>

              <Input
                label="Nome Completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
              />

              <Input
                label="Email"
                value={user?.email || ''}
                disabled
                className="bg-neutral-100"
              />
            </div>

            {/* Informações de Gestor */}
            {isGestor && (
              <div className="space-y-4 pt-6 border-t-2 border-neutral-200">
                <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Informações Profissionais
                </h3>

                <Input
                  label="Cargo"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Gerente de Projetos"
                />

                <Input
                  label="Departamento"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="Ex: Tecnologia"
                />

                <Textarea
                  label="Bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte um pouco sobre você e sua experiência"
                  rows={4}
                />

                <div className="pt-4 border-t-2 border-neutral-200">
                  <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2 mb-4">
                    <Slack className="w-5 h-5" />
                    Integração Slack
                  </h3>

                  <Input
                    label="Slack User ID"
                    value={slackUserId}
                    onChange={(e) => setSlackUserId(e.target.value)}
                    placeholder="Ex: U01234ABCDE"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Seu ID de usuário do Slack para receber notificações de avaliações.
                    Encontre em: Perfil do Slack &gt; Mais &gt; Copiar ID do membro.
                  </p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4">
              <Button onClick={handleSave} loading={saving} className="w-full">
                <Save className="w-5 h-5" />
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas do Gestor */}
        {isGestor && user?.gestor && (
          <Card className="mt-6">
            <CardTitle className="mb-4">Suas Estatísticas</CardTitle>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-gold-50 border-2 border-neutral-900 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-neutral-900">
                    {user.gestor.mediaAvaliacao?.toFixed(1) || '0.0'}
                  </p>
                  <p className="text-xs sm:text-sm text-neutral-600">Média de Avaliação</p>
                </div>
                <div className="p-3 sm:p-4 bg-primary-50 border-2 border-neutral-900 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-neutral-900">
                    {user.gestor.totalAvaliacoes || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-neutral-600">Total de Avaliações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
