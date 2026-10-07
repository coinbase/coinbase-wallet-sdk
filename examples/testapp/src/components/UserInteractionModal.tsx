import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

interface UserInteractionModalProps {
  isOpen: boolean;
  testName: string;
  onContinue: () => void;
  onCancel: () => void;
}

export function UserInteractionModal({
  isOpen,
  testName,
  onContinue,
  onCancel,
}: UserInteractionModalProps) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the continue button when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        continueButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Enter key to continue
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onContinue();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onContinue, onCancel]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={true}
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <ModalContent>
        <ModalHeader>User Interaction Required</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text>The next test requires user interaction to prevent popup blockers:</Text>
            <Text fontWeight="bold" fontSize="lg" color="purple.500">
              {testName}
            </Text>
            <Box
              bg="purple.50"
              borderWidth="2px"
              borderColor="purple.400"
              borderRadius="md"
              p={4}
              textAlign="center"
            >
              <Text fontWeight="bold" fontSize="xl" color="purple.600">
                [Press Enter to Continue]
              </Text>
            </Box>
            <Text fontSize="sm" color="gray.600">
              Or click "Continue Test" to proceed, or "Cancel Test" to stop the test suite.
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel Test
          </Button>
          <Button ref={continueButtonRef} colorScheme="purple" onClick={onContinue}>
            Continue Test
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
