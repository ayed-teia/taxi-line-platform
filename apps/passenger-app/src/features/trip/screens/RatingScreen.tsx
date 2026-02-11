import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';

interface RatingScreenProps {
  tripId: string;
  finalPriceIls: number;
  onSubmit: (rating: number, comment?: string) => Promise<void>;
  onSkip: () => void;
}

/**
 * Star rating component
 */
function StarRating({
  rating,
  onRatingChange,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRatingChange(star)}
          style={styles.starButton}
        >
          <Text style={[styles.star, rating >= star && styles.starFilled]}>
            {rating >= star ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Rating screen shown after trip completion
 * Allows passenger to rate the driver (1-5 stars) with optional comment
 */
export function RatingScreen({
  tripId: _tripId,
  finalPriceIls,
  onSubmit,
  onSkip,
}: RatingScreenProps) {
  // tripId is passed for future use (e.g., analytics)
  void _tripId;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim() || undefined);
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = () => {
    switch (rating) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return 'Tap to rate';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.title}>Trip Completed!</Text>
        <Text style={styles.price}>₪{finalPriceIls.toFixed(2)}</Text>
      </View>

      {/* Payment Info Card */}
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentIcon}>💳</Text>
          <Text style={styles.paymentTitle}>Payment Required</Text>
        </View>
        <View style={styles.paymentDetails}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Amount</Text>
            <Text style={styles.paymentAmount}>₪{finalPriceIls.toFixed(2)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Method</Text>
            <View style={styles.paymentMethodBadge}>
              <Text style={styles.paymentMethodText}>💵 Cash</Text>
              <Text style={styles.comingSoonText}>(coming soon: card)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Rating section */}
      <View style={styles.ratingSection}>
        <Text style={styles.ratingTitle}>How was your trip?</Text>
        <StarRating rating={rating} onRatingChange={setRating} />
        <Text style={styles.ratingText}>{getRatingText()}</Text>
      </View>

      {/* Comment section */}
      <View style={styles.commentSection}>
        <Text style={styles.commentLabel}>Add a comment (optional)</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Tell us about your experience..."
          placeholderTextColor="#8E8E93"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={500}
          numberOfLines={3}
        />
        <Text style={styles.charCount}>{comment.length}/500</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Rating</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          disabled={submitting}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkmark: {
    fontSize: 48,
    color: '#34C759',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ratingSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 40,
    color: '#D1D1D6',
  },
  starFilled: {
    color: '#FFD700',
  },
  ratingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  commentSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1C1C1E',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  // Payment card styles
  paymentCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  paymentDetails: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  paymentMethodBadge: {
    alignItems: 'flex-end',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  comingSoonText: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});
