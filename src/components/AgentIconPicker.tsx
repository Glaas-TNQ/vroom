import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, Search } from 'lucide-react';

// Extended icon list organized by category
const ICON_CATEGORIES = {
  business: [
    { value: 'briefcase', emoji: '💼', label: 'Briefcase' },
    { value: 'chart', emoji: '📊', label: 'Chart' },
    { value: 'money', emoji: '💰', label: 'Money' },
    { value: 'bank', emoji: '🏦', label: 'Bank' },
    { value: 'credit-card', emoji: '💳', label: 'Credit Card' },
    { value: 'handshake', emoji: '🤝', label: 'Handshake' },
    { value: 'presentation', emoji: '📈', label: 'Presentation' },
    { value: 'contract', emoji: '📝', label: 'Contract' },
    { value: 'calculator', emoji: '🧮', label: 'Calculator' },
    { value: 'building', emoji: '🏢', label: 'Building' },
  ],
  legal: [
    { value: 'scale', emoji: '⚖️', label: 'Scale' },
    { value: 'gavel', emoji: '🔨', label: 'Gavel' },
    { value: 'shield', emoji: '🛡️', label: 'Shield' },
    { value: 'lock', emoji: '🔒', label: 'Lock' },
    { value: 'document', emoji: '📄', label: 'Document' },
    { value: 'stamp', emoji: '📮', label: 'Stamp' },
  ],
  tech: [
    { value: 'bot', emoji: '🤖', label: 'Robot' },
    { value: 'computer', emoji: '💻', label: 'Computer' },
    { value: 'code', emoji: '👨‍💻', label: 'Code' },
    { value: 'gear', emoji: '⚙️', label: 'Gear' },
    { value: 'chip', emoji: '🔌', label: 'Chip' },
    { value: 'database', emoji: '🗄️', label: 'Database' },
    { value: 'cloud', emoji: '☁️', label: 'Cloud' },
    { value: 'network', emoji: '🌐', label: 'Network' },
    { value: 'mobile', emoji: '📱', label: 'Mobile' },
    { value: 'ai', emoji: '🧠', label: 'AI Brain' },
  ],
  creative: [
    { value: 'palette', emoji: '🎨', label: 'Palette' },
    { value: 'pencil', emoji: '✏️', label: 'Pencil' },
    { value: 'camera', emoji: '📷', label: 'Camera' },
    { value: 'music', emoji: '🎵', label: 'Music' },
    { value: 'video', emoji: '🎬', label: 'Video' },
    { value: 'lightbulb', emoji: '💡', label: 'Lightbulb' },
    { value: 'star', emoji: '⭐', label: 'Star' },
    { value: 'sparkles', emoji: '✨', label: 'Sparkles' },
    { value: 'rainbow', emoji: '🌈', label: 'Rainbow' },
    { value: 'magic', emoji: '🪄', label: 'Magic' },
  ],
  people: [
    { value: 'brain', emoji: '🧠', label: 'Brain' },
    { value: 'target', emoji: '🎯', label: 'Target' },
    { value: 'user', emoji: '👤', label: 'User' },
    { value: 'users', emoji: '👥', label: 'Users' },
    { value: 'detective', emoji: '🕵️', label: 'Detective' },
    { value: 'scientist', emoji: '🧑‍🔬', label: 'Scientist' },
    { value: 'teacher', emoji: '👨‍🏫', label: 'Teacher' },
    { value: 'doctor', emoji: '👨‍⚕️', label: 'Doctor' },
    { value: 'pilot', emoji: '👨‍✈️', label: 'Pilot' },
    { value: 'astronaut', emoji: '👨‍🚀', label: 'Astronaut' },
  ],
  nature: [
    { value: 'globe', emoji: '🌍', label: 'Globe' },
    { value: 'tree', emoji: '🌳', label: 'Tree' },
    { value: 'leaf', emoji: '🍃', label: 'Leaf' },
    { value: 'sun', emoji: '☀️', label: 'Sun' },
    { value: 'moon', emoji: '🌙', label: 'Moon' },
    { value: 'fire', emoji: '🔥', label: 'Fire' },
    { value: 'water', emoji: '💧', label: 'Water' },
    { value: 'mountain', emoji: '⛰️', label: 'Mountain' },
    { value: 'ocean', emoji: '🌊', label: 'Ocean' },
    { value: 'flower', emoji: '🌸', label: 'Flower' },
  ],
  objects: [
    { value: 'rocket', emoji: '🚀', label: 'Rocket' },
    { value: 'compass', emoji: '🧭', label: 'Compass' },
    { value: 'key', emoji: '🔑', label: 'Key' },
    { value: 'magnifier', emoji: '🔍', label: 'Magnifier' },
    { value: 'book', emoji: '📚', label: 'Book' },
    { value: 'trophy', emoji: '🏆', label: 'Trophy' },
    { value: 'medal', emoji: '🏅', label: 'Medal' },
    { value: 'crown', emoji: '👑', label: 'Crown' },
    { value: 'gem', emoji: '💎', label: 'Gem' },
    { value: 'hourglass', emoji: '⏳', label: 'Hourglass' },
  ],
  symbols: [
    { value: 'heart', emoji: '❤️', label: 'Heart' },
    { value: 'checkmark', emoji: '✅', label: 'Checkmark' },
    { value: 'warning', emoji: '⚠️', label: 'Warning' },
    { value: 'info', emoji: 'ℹ️', label: 'Info' },
    { value: 'question', emoji: '❓', label: 'Question' },
    { value: 'bolt', emoji: '⚡', label: 'Bolt' },
    { value: 'infinity', emoji: '♾️', label: 'Infinity' },
    { value: 'atom', emoji: '⚛️', label: 'Atom' },
    { value: 'yin-yang', emoji: '☯️', label: 'Yin Yang' },
    { value: 'recycle', emoji: '♻️', label: 'Recycle' },
  ],
};

// Flatten all icons for search
const ALL_ICONS = Object.values(ICON_CATEGORIES).flat();

// Create a lookup map
export const ICON_MAP: Record<string, string> = {};
ALL_ICONS.forEach(icon => {
  ICON_MAP[icon.value] = icon.emoji;
});

// Add legacy mappings
ICON_MAP['briefcase'] = '💼';
ICON_MAP['scale'] = '⚖️';
ICON_MAP['target'] = '🎯';
ICON_MAP['brain'] = '🧠';
ICON_MAP['chart'] = '📊';
ICON_MAP['bot'] = '🤖';

interface AgentIconPickerProps {
  value: string;
  avatarUrl?: string | null;
  color: string;
  onIconChange: (icon: string) => void;
  onAvatarChange: (url: string | null) => void;
}

export default function AgentIconPicker({
  value,
  avatarUrl,
  color,
  onIconChange,
  onAvatarChange,
}: AgentIconPickerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredIcons = search
    ? ALL_ICONS.filter(icon => 
        icon.label.toLowerCase().includes(search.toLowerCase()) ||
        icon.value.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const handleIconSelect = (iconValue: string) => {
    onIconChange(iconValue);
    onAvatarChange(null); // Clear custom avatar when selecting an icon
    setOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: t('common.error'), 
        description: 'Please upload an image file',
        variant: 'destructive' 
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ 
        title: t('common.error'), 
        description: 'Image must be smaller than 2MB',
        variant: 'destructive' 
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('agent-avatars')
        .getPublicUrl(fileName);

      onAvatarChange(publicUrl);
      setOpen(false);
      toast({ title: t('common.success'), description: 'Image uploaded!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ 
        title: t('common.error'), 
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const currentDisplay = avatarUrl ? (
    <img src={avatarUrl} alt="Agent avatar" className="h-full w-full object-cover" />
  ) : (
    <span className="text-2xl">{ICON_MAP[value] || '🤖'}</span>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="h-16 w-16 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer"
          style={{ backgroundColor: avatarUrl ? undefined : `${color}20` }}
        >
          {currentDisplay}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose Agent Icon</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="icons" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="icons">Icons</TabsTrigger>
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
          </TabsList>

          <TabsContent value="icons" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search icons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px]">
              {filteredIcons ? (
                <div className="space-y-4">
                  <Label className="text-xs text-muted-foreground">
                    {filteredIcons.length} results
                  </Label>
                  <div className="grid grid-cols-8 gap-2">
                    {filteredIcons.map((icon) => (
                      <button
                        key={icon.value}
                        type="button"
                        onClick={() => handleIconSelect(icon.value)}
                        className={`h-10 w-10 rounded-lg flex items-center justify-center text-xl hover:bg-muted transition-colors ${
                          value === icon.value && !avatarUrl ? 'ring-2 ring-primary bg-muted' : ''
                        }`}
                        title={icon.label}
                      >
                        {icon.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(ICON_CATEGORIES).map(([category, icons]) => (
                    <div key={category} className="space-y-2">
                      <Label className="text-xs text-muted-foreground capitalize">
                        {category}
                      </Label>
                      <div className="grid grid-cols-8 gap-2">
                        {icons.map((icon) => (
                          <button
                            key={icon.value}
                            type="button"
                            onClick={() => handleIconSelect(icon.value)}
                            className={`h-10 w-10 rounded-lg flex items-center justify-center text-xl hover:bg-muted transition-colors ${
                              value === icon.value && !avatarUrl ? 'ring-2 ring-primary bg-muted' : ''
                            }`}
                            title={icon.label}
                          >
                            {icon.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed border-border rounded-lg">
              {avatarUrl ? (
                <div className="space-y-4 text-center">
                  <img 
                    src={avatarUrl} 
                    alt="Current avatar" 
                    className="h-24 w-24 rounded-lg object-cover mx-auto"
                  />
                  <p className="text-sm text-muted-foreground">Current custom image</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Change Image'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onAvatarChange(null);
                        setOpen(false);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Upload a custom image</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG up to 2MB</p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Select Image
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
