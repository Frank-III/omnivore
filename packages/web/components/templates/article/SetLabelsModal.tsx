import { useCallback, useEffect, useRef, useState } from 'react'
import { Label } from '../../../lib/networking/fragments/labelFragment'
import { SpanBox, VStack } from '../../elements/LayoutPrimitives'
import {
  ModalRoot,
  ModalOverlay,
  ModalContent,
  ModalTitleBar,
} from '../../elements/ModalPrimitives'
import { LabelsProvider, SetLabelsControl } from './SetLabelsControl'
import { createLabelMutation } from '../../../lib/networking/mutations/createLabelMutation'
import { showSuccessToast } from '../../../lib/toastHelpers'
import { useGetLabelsQuery } from '../../../lib/networking/queries/useGetLabelsQuery'
import { v4 as uuidv4 } from 'uuid'
import { randomLabelColorHex } from '../../../utils/settings-page/labels/labelColorObjects'

type SetLabelsModalProps = {
  provider: LabelsProvider

  onLabelsUpdated?: (labels: Label[]) => void
  onOpenChange: (open: boolean) => void
  save: (labels: Label[]) => Promise<Label[] | undefined>
}

export function SetLabelsModal(props: SetLabelsModalProps): JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const availableLabels = useGetLabelsQuery()
  const [tabCount, setTabCount] = useState(-1)
  const [tabStartValue, setTabStartValue] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  )
  const errorTimeoutRef = useRef<NodeJS.Timeout | undefined>()
  const [highlightLastLabel, setHighlightLastLabel] = useState(false)

  const [selectedLabels, setSelectedLabels] = useState(
    props.provider.labels ?? []
  )

  const containsTemporaryLabel = (labels: Label[]) => {
    return !!labels.find((l) => '_temporary' in l)
  }

  const onOpenChange = useCallback(
    (open: boolean) => {
      ;(async () => {
        await props.save(selectedLabels)
        props.onOpenChange(open)
      })()
    },
    [props, selectedLabels]
  )

  const showMessage = useCallback(
    (msg: string, timeout?: number) => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
        errorTimeoutRef.current = undefined
      }
      setErrorMessage(msg)
      if (timeout) {
        errorTimeoutRef.current = setTimeout(() => {
          setErrorMessage(undefined)
          if (errorTimeoutRef.current) {
            clearTimeout(errorTimeoutRef.current)
            errorTimeoutRef.current = undefined
          }
        }, timeout)
      }
    },
    [errorTimeoutRef]
  )

  useEffect(() => {
    const maxLengthMessage = 'Max label length: 48 chars'

    if (inputValue.length >= 48) {
      showMessage(maxLengthMessage)
    } else if (errorMessage === maxLengthMessage) {
      setErrorMessage(undefined)
    }

    if (inputValue.length > 0) {
      setHighlightLastLabel(false)
    }
  }, [inputValue, showMessage])

  const clearInputState = useCallback(() => {
    setTabCount(-1)
    setInputValue('')
    setTabStartValue('')
    setHighlightLastLabel(false)
  }, [tabCount, tabStartValue, highlightLastLabel])

  const createLabelAsync = useCallback(
    (newLabels: Label[], tempLabel: Label) => {
      ;(async () => {
        const currentLabels = newLabels
        const newLabel = await createLabelMutation(
          tempLabel.name,
          tempLabel.color
        )
        const idx = currentLabels.findIndex((l) => l.id === tempLabel.id)
        if (newLabel) {
          showSuccessToast(`Created label ${newLabel.name}`, {
            position: 'bottom-right',
          })
          if (idx !== -1) {
            currentLabels[idx] = newLabel
            setSelectedLabels([...currentLabels])
          } else {
            setSelectedLabels([...currentLabels, newLabel])
          }
        } else {
          showMessage(`Error creating label ${tempLabel.name}`, 5000)
          if (idx !== -1) {
            currentLabels.splice(idx, 1)
            setSelectedLabels([...currentLabels])
          }
        }
      })()
    },
    [selectedLabels]
  )

  const selectOrCreateLabel = useCallback(
    (value: string) => {
      const current = selectedLabels ?? []
      const lowerCasedValue = value.toLowerCase()
      const existing = availableLabels.labels.find(
        (l) => l.name.toLowerCase() == lowerCasedValue
      )

      if (lowerCasedValue.length < 1) {
        return
      }

      if (existing) {
        const isAdded = selectedLabels.find(
          (l) => l.name.toLowerCase() == lowerCasedValue
        )
        if (!isAdded) {
          setSelectedLabels([...current, existing])
          clearInputState()
        } else {
          showMessage(`label ${value} already added.`, 5000)
        }
      } else {
        const tempLabel = {
          id: uuidv4(),
          name: value,
          color: randomLabelColorHex(),
          description: '',
          createdAt: new Date(),
          _temporary: true,
        }
        const newLabels = [...current, tempLabel]
        setSelectedLabels(newLabels)
        clearInputState()

        createLabelAsync(newLabels, tempLabel)
      }
    },
    [
      availableLabels,
      selectedLabels,
      clearInputState,
      createLabelAsync,
      showMessage,
    ]
  )

  const deleteLastLabel = useCallback(() => {
    if (highlightLastLabel) {
      const current = selectedLabels
      current.pop()
      setSelectedLabels([...current])
      setHighlightLastLabel(false)
    } else {
      setHighlightLastLabel(true)
    }
  }, [highlightLastLabel, selectedLabels])

  useEffect(() => {
    if (!containsTemporaryLabel(selectedLabels)) {
      ;(async () => {
        await props.save(selectedLabels)
      })()
    }
  }, [props.save, selectedLabels])

  return (
    <ModalRoot defaultOpen onOpenChange={onOpenChange}>
      <ModalOverlay />
      <ModalContent
        css={{
          border: '1px solid $grayBorder',
          backgroundColor: '$thBackground',
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault()
          onOpenChange(false)
        }}
      >
        <VStack distribution="start" css={{ height: '100%' }}>
          <SpanBox css={{ pt: '0px', px: '16px', width: '100%' }}>
            <ModalTitleBar title="Labels" onOpenChange={onOpenChange} />
          </SpanBox>
          <SetLabelsControl
            provider={props.provider}
            inputValue={inputValue}
            setInputValue={setInputValue}
            clearInputState={clearInputState}
            selectedLabels={selectedLabels}
            setSelectedLabels={setSelectedLabels}
            onLabelsUpdated={props.onLabelsUpdated}
            tabCount={tabCount}
            setTabCount={setTabCount}
            tabStartValue={tabStartValue}
            setTabStartValue={setTabStartValue}
            highlightLastLabel={highlightLastLabel}
            setHighlightLastLabel={setHighlightLastLabel}
            deleteLastLabel={deleteLastLabel}
            selectOrCreateLabel={selectOrCreateLabel}
            errorMessage={errorMessage}
          />
        </VStack>
      </ModalContent>
    </ModalRoot>
  )
}
