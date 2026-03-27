import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from '@chakra-ui/react';
import { useCallback, useRef } from 'react';
import { cleanupSDKLocalStorage } from '../../utils/cleanupSDKLocalStorage';

export const DisconnectedAlert = ({
  isOpen,
  onClose,
}: { isOpen: boolean; onClose: () => void }) => {
  const cancelRef = useRef();

  const handleReload = useCallback(() => {
    cleanupSDKLocalStorage();
    window.location.reload();
  }, []);

  return (
    <AlertDialog
      motionPreset="slideInBottom"
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isOpen={isOpen}
      isCentered
    >
      <AlertDialogOverlay />
      <AlertDialogContent>
        <AlertDialogHeader>Wallet Disconnected</AlertDialogHeader>
        <AlertDialogCloseButton />
        <AlertDialogBody>
          The wallet has been disconnected and is returning 4100 disconnected error. Do you want to
          reload the page?
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button ref={cancelRef} onClick={onClose}>
            No
          </Button>
          <Button colorScheme="red" ml={3} onClick={handleReload}>
            Yes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
