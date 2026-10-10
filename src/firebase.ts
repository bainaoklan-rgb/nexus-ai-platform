import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'app_settings', 'global'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

const BOOTSTRAPPED_ADMIN_EMAIL = 'bainaoklan@gmail.com';

// Ensure User & UserProfile documents exist in Firestore on login
export async function ensureUserDocuments(user: FirebaseUser, customName?: string) {
  if (!user.emailVerified && user.providerData[0]?.providerId === 'password') {
    // Unverified email/password accounts cannot write under strict verified rules until verified
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  const profileRef = doc(db, 'user_profiles', user.uid);

  try {
    const existingSnap = await getDoc(userRef);
    const displayName = (customName || user.displayName || user.email?.split('@')[0] || 'Criador')
      .trim()
      .slice(0, 100);
    const photoURL = (user.photoURL || '').slice(0, 500);
    const isBootstrappedAdmin =
      user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified === true;

    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        photoURL,
        role: isBootstrappedAdmin ? 'admin' : 'user',
        planId: isBootstrappedAdmin ? 'studio' : 'free',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      await setDoc(profileRef, {
        uid: user.uid,
        email: (user.email || 'sem-email@nexus.app').slice(0, 150),
        phone: '',
        bio: '',
        niche: 'Criação de Conteúdo Digital',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Automatic internal platform notification on account activation (non-duplicated deterministic ID)
    const welcomeNotifId = `notif_welcome_${user.uid}`.slice(0, 128);
    const welcomeNotifRef = doc(db, 'user_notifications', welcomeNotifId);
    const welcomeSnap = await getDoc(welcomeNotifRef);
    if (!welcomeSnap.exists()) {
      await setDoc(welcomeNotifRef, {
        id: welcomeNotifId,
        userId: user.uid,
        eventKey: 'welcome_account_activated',
        title: 'Bem-vindo ao NEXUS AI STUDIO',
        message:
          'Sua conta está ativa! Agora você conta com o novo Chat Inteligente com histórico persistente, o Assistente Robô NEXUS, o NEXUS LAB e as 8 ferramentas criativas reais.',
        category: 'melhoria',
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (isBootstrappedAdmin) {
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: user.uid,
          email: (user.email || BOOTSTRAPPED_ADMIN_EMAIL).slice(0, 150),
          createdAt: serverTimestamp(),
        });
      }

      // Seed initial official published announcement if not yet created
      const initialAnnId = 'ann_nexus_v2_launch';
      const initialAnnRef = doc(db, 'announcements', initialAnnId);
      const initialAnnSnap = await getDoc(initialAnnRef);
      if (!initialAnnSnap.exists()) {
        await setDoc(initialAnnRef, {
          id: initialAnnId,
          title: 'Nova Interface de Conversa IA, Robô NEXUS e Central de Atualizações',
          message:
            'O NEXUS AI STUDIO recebeu o novo Menu Lateral expansível, área central de Conversa IA com histórico persistente no Cloud Firestore, o Assistente Robô NEXUS e a Central de Atualizações em tempo real.',
          category: 'nova_ferramenta',
          status: 'published',
          targetAudience: 'all',
          authorUid: user.uid,
          authorEmail: (user.email || BOOTSTRAPPED_ADMIN_EMAIL).slice(0, 150),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const settingsRef = doc(db, 'app_settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const sData = settingsSnap.data();
        if (!sData.proPixLink || !sData.studioPixLink) {
          await setDoc(settingsRef, {
            id: 'global',
            freeDailyLimit: Number(sData.freeDailyLimit || 5),
            proDailyLimit: Number(sData.proDailyLimit || 100),
            studioDailyLimit: Number(sData.studioDailyLimit || 500),
            proPriceCents: Number(sData.proPriceCents || 1990),
            studioPriceCents: Number(sData.studioPriceCents || 3990),
            proPixLink:
              sData.proPixLink ||
              'https://nubank.com.br/cobrar/90ldd3/6ac97ae0-2ce1-4d8f-a685-c673c40677f5',
            studioPixLink:
              sData.studioPixLink ||
              'https://nubank.com.br/cobrar/90ldd3/6ac97b26-1c25-48d6-b267-b7a4d750f7fb',
            pixKey:
              sData.pixKey ||
              'https://nubank.com.br/cobrar/90ldd3/6ac97ae0-2ce1-4d8f-a685-c673c40677f5',
            pixKeyType: sData.pixKeyType || 'Link de Cobrança Pix Nubank',
            pixHolderName: sData.pixHolderName || 'NEXUS AI STUDIO (Conta Nubank)',
            pixBankName: sData.pixBankName || 'Nu Pagamentos S.A. (Nubank)',
            supportEmail: sData.supportEmail || 'suporte@nexusaistudio.com.br',
            termsOfUse: sData.termsOfUse || 'Termos de Uso NEXUS AI STUDIO',
            privacyPolicy: sData.privacyPolicy || 'Política de Privacidade NEXUS AI STUDIO',
            cancellationPolicy:
              sData.cancellationPolicy || 'Política de Cancelamento NEXUS AI STUDIO',
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
};
export type { FirebaseUser };
