import React, { useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Shield, Users, Ban, Mic, MicOff, UserX, AlertTriangle, MessageCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, duration?: string) => void;
  title: string;
  description: string;
  type: 'ban' | 'mute' | 'role';
}

const ActionDialog: React.FC<ActionDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description,
  type 
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [newRole, setNewRole] = useState('');

  const handleConfirm = () => {
    if (type === 'role') {
      onConfirm(newRole);
    } else {
      const expiresAt = duration ? new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString() : undefined;
      onConfirm(reason, expiresAt);
    }
    setReason('');
    setDuration('');
    setNewRole('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {type === 'role' ? (
          <div className="space-y-2">
            <Label>Nuovo Ruolo</Label>
            <Select onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dipendente">Dipendente</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Amministratore">Amministratore</SelectItem>
                <SelectItem value="Magazziniere">Magazziniere</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Inserisci il motivo..."
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Durata (ore) - Lascia vuoto per permanente</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="24"
                min="1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button 
            onClick={handleConfirm}
            disabled={type === 'role' ? !newRole : !reason}
          >
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AdminPanel: React.FC = () => {
  const { 
    isSystemAdmin, 
    users, 
    bans, 
    mutes, 
    loading, 
    updateUserRole, 
    banUser, 
    muteUser, 
    unbanUser, 
    unmuteUser,
    deleteAllMessages
  } = useAdmin();

  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    type: 'ban' | 'mute' | 'role';
    userId?: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'ban',
    title: '',
    description: ''
  });

  const [deleteMessagesDialog, setDeleteMessagesDialog] = useState(false);

  if (!isSystemAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Accesso Negato</h3>
          <p className="text-muted-foreground">Solo gli amministratori di sistema possono accedere a questo pannello.</p>
        </div>
      </div>
    );
  }

  const handleBanUser = (userId: string, userName: string) => {
    setActionDialog({
      isOpen: true,
      type: 'ban',
      userId,
      title: `Banna ${userName}`,
      description: `Sei sicuro di voler bannare questo utente? L'utente non potrà più accedere all'applicazione.`
    });
  };

  const handleMuteUser = (userId: string, userName: string) => {
    setActionDialog({
      isOpen: true,
      type: 'mute',
      userId,
      title: `Silenzia ${userName}`,
      description: `Sei sicuro di voler silenziare questo utente? L'utente non potrà inviare messaggi in chat.`
    });
  };

  const handleChangeRole = (userId: string, userName: string) => {
    setActionDialog({
      isOpen: true,
      type: 'role',
      userId,
      title: `Cambia Ruolo - ${userName}`,
      description: `Seleziona il nuovo ruolo per questo utente.`
    });
  };

  const handleActionConfirm = async (value: string, duration?: string) => {
    if (!actionDialog.userId) return;

    let success = false;
    
    switch (actionDialog.type) {
      case 'ban':
        success = await banUser(actionDialog.userId, value, duration);
        break;
      case 'mute':
        success = await muteUser(actionDialog.userId, value, duration);
        break;
      case 'role':
        success = await updateUserRole(actionDialog.userId, value);
        break;
    }

    if (success) {
      // Success feedback could be added here
    }
  };

  const handleDeleteAllMessages = async () => {
    const success = await deleteAllMessages();
    if (success) {
      setDeleteMessagesDialog(false);
      // Success feedback could be added here
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Amministratore': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Manager': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Magazziniere': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Pannello Amministrativo</h1>
      </div>

      {/* Widget Eliminazione Messaggi */}
      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <MessageCircle className="h-5 w-5" />
            Gestione Chat
          </CardTitle>
          <CardDescription>
            Strumenti per la gestione dei messaggi della chat di lavoro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={() => setDeleteMessagesDialog(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Elimina Tutti i Messaggi
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger value="bans" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Ban ({bans.length})
          </TabsTrigger>
          <TabsTrigger value="mutes" className="flex items-center gap-2">
            <MicOff className="h-4 w-4" />
            Mute ({mutes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Utenti</CardTitle>
              <CardDescription>
                Gestisci i ruoli degli utenti e applica sanzioni
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                         <span className={`${getRoleColor(user.role)} inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold`}>
                           {user.role}
                         </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangeRole(user.id, user.name)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMuteUser(user.id, user.name)}
                      >
                        <MicOff className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBanUser(user.id, user.name)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utenti Bannati</CardTitle>
              <CardDescription>
                Gestisci i ban degli utenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bans.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nessun utente bannato
                  </p>
                ) : (
                  bans.map((ban) => (
                    <div key={ban.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{ban.targetUserName}</h4>
                        <p className="text-sm text-muted-foreground">{ban.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ban.createdAt), { addSuffix: true, locale: it })}
                          {ban.expiresAt && ` - Scade ${formatDistanceToNow(new Date(ban.expiresAt), { addSuffix: true, locale: it })}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unbanUser(ban.id)}
                      >
                        Rimuovi Ban
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mutes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utenti Silenziati</CardTitle>
              <CardDescription>
                Gestisci i mute degli utenti in chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mutes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nessun utente silenziato
                  </p>
                ) : (
                  mutes.map((mute) => (
                    <div key={mute.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{mute.targetUserName}</h4>
                        <p className="text-sm text-muted-foreground">{mute.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(mute.createdAt), { addSuffix: true, locale: it })}
                          {mute.expiresAt && ` - Scade ${formatDistanceToNow(new Date(mute.expiresAt), { addSuffix: true, locale: it })}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unmuteUser(mute.id)}
                      >
                        Rimuovi Mute
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ActionDialog
        isOpen={actionDialog.isOpen}
        onClose={() => setActionDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleActionConfirm}
        title={actionDialog.title}
        description={actionDialog.description}
        type={actionDialog.type}
      />

      {/* Dialog Eliminazione Messaggi */}
      <Dialog open={deleteMessagesDialog} onOpenChange={setDeleteMessagesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminare Tutti i Messaggi?</DialogTitle>
            <DialogDescription>
              Questa azione eliminerà permanentemente tutti i messaggi della chat di lavoro.
              <br />
              <strong>Questa operazione non può essere annullata.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMessagesDialog(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllMessages}>
              Elimina Tutto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};