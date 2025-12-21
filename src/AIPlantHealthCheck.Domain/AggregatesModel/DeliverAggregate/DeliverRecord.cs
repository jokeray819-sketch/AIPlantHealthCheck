using AIPlantHealthCheck.Domain.AggregatesModel.OrderAggregate;

namespace AIPlantHealthCheck.Domain.AggregatesModel.DeliverAggregate;

public partial record DeliverRecordId : IGuidStronglyTypedId;

public class DeliverRecord : Entity<DeliverRecordId>, IAggregateRoot
{
    protected DeliverRecord() { }


    public DeliverRecord(OrderId orderId)
    {
        this.OrderId = orderId;
    }

    public OrderId OrderId { get; private set; } = default!;
}

